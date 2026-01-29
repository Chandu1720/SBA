const cron = require('node-cron');
const Bill = require('../models/Bill');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const moment = require('moment');

// Schedule a job to run every day at 10:00 AM
const scheduleJobs = () => {
    cron.schedule('0 10 * * *', async () => {
        console.log('Running daily check for due dates...');
        await checkSupplierDues();
        await checkCustomerDues();
    });
};

const checkSupplierDues = async () => {
    try {
        const sevenDaysFromNow = moment().add(7, 'days').endOf('day').toDate();
        const overdueInvoices = await Invoice.find({
            dueDate: { $lte: sevenDaysFromNow },
            paymentStatus: { $ne: 'Paid' }
        }).populate('supplierId');

        for (const invoice of overdueInvoices) {
            const existingNotification = await Notification.findOne({
                link: `/invoices/${invoice._id}`
            });

            if (!existingNotification) {
                const dueDate = moment(invoice.dueDate);
                const now = moment().startOf('day');
                let message;

                if (dueDate.isBefore(now, 'day')) {
                    const daysOverdue = now.diff(dueDate, 'days');
                    message = `Payment to ${invoice.supplierId?.name || 'supplier'} is overdue by ${daysOverdue} day(s).`;
                } else {
                    const daysUntilDue = dueDate.diff(now, 'days');
                    message = `Payment to ${invoice.supplierId?.name || 'supplier'} is due in ${daysUntilDue} day(s).`;
                }
                
                if (invoice.supplierId) {
                    await Notification.create({
                        message,
                        type: 'supplier_due',
                        link: `/invoices/${invoice._id}`,
                        dueDate: invoice.dueDate
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking supplier dues:', error);
    }
};

const checkCustomerDues = async () => {
    try {
        const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').toDate();
        const overdueBills = await Bill.find({
            billDate: { $lte: thirtyDaysAgo },
            paymentStatus: { $ne: 'Paid' }
        });

        for (const bill of overdueBills) {
            const existingNotification = await Notification.findOne({
                link: `/bills/${bill._id}`
            });

            if (!existingNotification) {
                const billDate = moment(bill.billDate);
                const daysOverdue = moment().startOf('day').diff(billDate, 'days');
                const message = `Payment from ${bill.customerName || 'customer'} for bill #${bill.billNumber} is overdue by ${daysOverdue} days.`;

                await Notification.create({
                    message,
                    type: 'customer_due',
                    link: `/bills/${bill._id}`,
                    dueDate: bill.billDate // Using billDate as the reference date
                });
            }
        }
    } catch (error) {
        console.error('Error checking customer dues:', error);
    }
};

module.exports = scheduleJobs;
