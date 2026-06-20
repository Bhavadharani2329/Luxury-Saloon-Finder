const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const nodemailer = require('nodemailer');

// Helper to send booking email notification (Ethereal test accounts SMTP setup)
const sendBookingNotification = async (userEmail, userName, bookingDetails) => {
    try {
        // Create SMTP transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
            port: process.env.EMAIL_PORT || 587,
            auth: {
                user: process.env.EMAIL_USER || 'ethereal_user',
                pass: process.env.EMAIL_PASS || 'ethereal_pass'
            }
        });

        const mailOptions = {
            from: `"Bee Concierge" <${process.env.EMAIL_FROM || 'no-reply@bee-luxury.com'}>`,
            to: userEmail,
            subject: `Bee Reservation Confirmed: ${bookingDetails.salonName}`,
            html: `
                <div style="font-family: 'Georgia', serif; padding: 2rem; color: #1C120C; background: #FCFAF7; border: 1px solid #EAE0D5;">
                    <h2 style="color: #AA7C11; font-weight: 400; border-bottom: 1px solid #EAE0D5; padding-bottom: 0.5rem;">Bee — Beauty, Elevated.</h2>
                    <p>Dear ${userName},</p>
                    <p>Your premium booking has been successfully requested and registered via our concierge routing engine.</p>
                    <div style="background: rgba(212,175,55,0.05); padding: 1.5rem; border-left: 3px solid #D4AF37; margin: 1.5rem 0;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #AA7C11;">Appointment Summary</h4>
                        <p style="margin: 4px 0;"><strong>Salon:</strong> ${bookingDetails.salonName}</p>
                        <p style="margin: 4px 0;"><strong>Services:</strong> ${bookingDetails.servicesList}</p>
                        <p style="margin: 4px 0;"><strong>Date:</strong> ${bookingDetails.date}</p>
                        <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${bookingDetails.slot}</p>
                        <p style="margin: 4px 0;"><strong>Total Bill:</strong> ₹${bookingDetails.total.toLocaleString("en-IN")}</p>
                    </div>
                    <p style="font-size: 0.82rem; color: #9E8E81;">Please arrive 10 minutes prior to your slots. Present your digital VIP Booking Pass at the counter.</p>
                    <p style="margin-top: 2rem;">Regards,<br><strong>Bee Concierge Team</strong></p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Notification email dispatched:', nodemailer.getTestMessageUrl(info) || info.messageId);
    } catch (error) {
        console.error('SMTP Email dispatch error:', error.message);
    }
};

// @desc    Create a new booking reservation
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
    try {
        const { salonId, services, appointmentDate, timeSlot, totalBill } = req.body;

        if (!salonId || !services || services.length === 0 || !appointmentDate || !timeSlot || !totalBill) {
            res.status(400);
            throw new Error('Please enter all booking details (salonId, services, appointmentDate, timeSlot, totalBill)');
        }

        const salon = await Salon.findById(salonId);
        if (!salon) {
            res.status(404);
            throw new Error('Salon not found');
        }

        // Fetch services detail
        const serviceObjs = await Service.find({ _id: { $in: services } });
        const servicesList = serviceObjs.map(s => s.name).join(', ');

        const booking = await Booking.create({
            user: req.user._id,
            salon: salonId,
            services,
            appointmentDate,
            timeSlot,
            totalBill
        });

        // Trigger asynchronous notification email
        const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        
        sendBookingNotification(req.user.email, req.user.name, {
            salonName: salon.name,
            servicesList,
            date: formattedDate,
            slot: timeSlot,
            total: totalBill
        });

        res.status(201).json({
            success: true,
            booking
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings of the logged-in customer
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('salon', 'name images neighborhood address')
            .populate('services')
            .sort('-appointmentDate');

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings of salons owned by the logged-in user
// @route   GET /api/bookings/owner-bookings
// @access  Private (Salon Owner / Admin)
const getOwnerBookings = async (req, res, next) => {
    try {
        // Find salons belonging to this owner
        const salons = await Salon.find({ owner: req.user._id }).select('_id');
        const salonIds = salons.map(s => s._id);

        const bookings = await Booking.find({ salon: { $in: salonIds } })
            .populate('user', 'name email phone')
            .populate('salon', 'name neighborhood')
            .populate('services')
            .sort('-appointmentDate');

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update booking reservation status
// @route   PUT /api/bookings/:id/status
// @access  Private (Owner / Admin)
const updateBookingStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            res.status(404);
            throw new Error('Booking not found');
        }

        // Verify status
        if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
            res.status(400);
            throw new Error('Invalid status option selected');
        }

        booking.status = status;
        if (status === 'Completed') {
            booking.paymentStatus = 'Paid';
        }

        await booking.save();

        res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getOwnerBookings,
    updateBookingStatus
};
