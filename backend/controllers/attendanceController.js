const asyncHandler = require('express-async-handler');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const QRCode = require('qrcode');

// @desc    Scan QR code and mark attendance
// @route   POST /api/attendance/scan
// @access  Private/Organizer
const scanQRCode = asyncHandler(async (req, res) => {
    const { qrData, eventId, scanMethod = 'camera' } = req.body;
    const organizerId = req.user.id;

    console.log('=== QR SCAN DEBUG ===');
    console.log('qrData:', qrData);
    console.log('eventId:', eventId);
    console.log('organizerId:', organizerId);
    console.log('scanMethod:', scanMethod);

    // Verify event exists and belongs to organizer
    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
        res.status(404);
        throw new Error('Event not found or access denied');
    }

    // Parse QR data
    let parsedQRData;
    try {
        parsedQRData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (error) {
        res.status(400);
        throw new Error('Invalid QR code format');
    }

    console.log('Parsed QR data:', parsedQRData);

    // Find registration by ticket ID
    const registration = await Registration.findOne({ 
        ticketId: parsedQRData.ticketId,
        event: eventId 
    })
    .populate('participant', 'firstName lastName email')
    .populate('event', 'eventName');

    if (!registration) {
        res.status(404);
        throw new Error('Invalid ticket or event mismatch');
    }

    // Check if already scanned
    const existingAttendance = await Attendance.findOne({
        event: eventId,
        participant: registration.user,
        status: { $in: ['scanned', 'manual'] }
    });

    if (existingAttendance) {
        res.status(400);
        throw new Error('Participant already scanned in');
    }

    // Create attendance record
    const attendance = new Attendance({
        event: eventId,
        registration: registration._id,
        participant: registration.user,
        scannedBy: organizerId,
        scanMethod,
        status: 'scanned',
        auditLog: [{
            action: 'scan',
            timestamp: new Date(),
            performedBy: organizerId,
            details: `QR code scanned via ${scanMethod}`
        }]
    });

    await attendance.save();

    console.log('Attendance created:', attendance);

    res.json({
        message: 'Attendance marked successfully',
        attendance: {
            _id: attendance._id,
            scannedAt: attendance.scannedAt,
            participant: registration.participant,
            eventName: registration.event.eventName,
            ticketId: parsedQRData.ticketId
        }
    });
});

// @desc    Get attendance for an event
// @route   GET /api/attendance/:eventId
// @access  Private/Organizer
const getEventAttendance = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    // Verify event belongs to organizer
    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
        res.status(404);
        throw new Error('Event not found or access denied');
    }

    // Get all registrations for the event
    const registrations = await Registration.find({ event: eventId })
        .populate('user', 'firstName lastName email')
        .populate('ticket', 'ticketId');

    // Get attendance records
    const attendanceRecords = await Attendance.find({ event: eventId })
        .populate('participant', 'firstName lastName email')
        .populate('scannedBy', 'firstName lastName')
        .sort({ scannedAt: 1 });

    // Combine data
    const attendanceData = registrations.map(registration => {
        const attendance = attendanceRecords.find(att => 
            att.participant._id.toString() === registration.user._id.toString()
        );

        return {
            registrationId: registration._id,
            participant: registration.user,
            ticketId: registration.ticket?.ticketId || 'N/A',
            scanned: !!attendance,
            scannedAt: attendance?.scannedAt || null,
            scannedBy: attendance?.scannedBy || null,
            scanMethod: attendance?.scanMethod || null,
            status: attendance?.status || 'not_scanned'
        };
    });

    res.json({
        event: {
            _id: event._id,
            eventName: event.eventName,
            eventDate: event.eventStartDate,
            totalRegistrations: registrations.length,
            scannedCount: attendanceRecords.filter(att => att.status === 'scanned').length,
            manualCount: attendanceRecords.filter(att => att.status === 'manual').length,
            rejectedCount: attendanceRecords.filter(att => att.status === 'rejected').length
        },
        attendance: attendanceData
    });
});

// @desc    Manual override for attendance
// @route   POST /api/attendance/manual-override
// @access  Private/Organizer
const manualOverride = asyncHandler(async (req, res) => {
    const { registrationId, action, reason } = req.body;
    const organizerId = req.user.id;

    // Find registration
    const registration = await Registration.findById(registrationId)
        .populate('event')
        .populate('user', 'firstName lastName email');

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    // Verify event belongs to organizer
    if (registration.event.organizerId.toString() !== organizerId) {
        res.status(403);
        throw new Error('Access denied');
    }

    // Check existing attendance
    let attendance = await Attendance.findOne({
        event: registration.event._id,
        participant: registration.user._id
    });

    if (attendance) {
        // Update existing attendance
        attendance.status = action === 'mark' ? 'manual' : 'rejected';
        attendance.manualOverrideReason = reason || '';
        attendance.notes = action === 'mark' ? 'Manually marked by organizer' : 'Manually rejected by organizer';
        
        attendance.auditLog.push({
            action: `manual_${action}`,
            timestamp: new Date(),
            performedBy: organizerId,
            details: reason || `Manual ${action} by organizer`
        });

        await attendance.save();
    } else if (action === 'mark') {
        // Create new attendance record
        attendance = new Attendance({
            event: registration.event._id,
            registration: registration._id,
            participant: registration.user._id,
            scannedBy: organizerId,
            scanMethod: 'manual_override',
            status: 'manual',
            manualOverrideReason: reason || '',
            notes: 'Manually marked by organizer',
            auditLog: [{
                action: 'manual_mark',
                timestamp: new Date(),
                performedBy: organizerId,
                details: reason || 'Manual mark by organizer'
            }]
        });

        await attendance.save();
    }

    res.json({
        message: `Attendance ${action === 'mark' ? 'marked' : 'rejected'} successfully`,
        attendance
    });
});

// @desc    Export attendance as CSV
// @route   GET /api/attendance/:eventId/export
// @access  Private/Organizer
const exportAttendanceCSV = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    // Verify event belongs to organizer
    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
        res.status(404);
        throw new Error('Event not found or access denied');
    }

    // Get attendance data
    const attendanceData = await Attendance.find({ event: eventId })
        .populate('participant', 'firstName lastName email')
        .populate('scannedBy', 'firstName lastName')
        .sort({ scannedAt: 1 });

    // Generate CSV
    const csvHeader = 'Ticket ID,Participant Name,Email,Scanned At,Scanned By,Scan Method,Status,Notes\n';
    
    const csvRows = attendanceData.map(record => {
        const participant = record.participant;
        const scannedBy = record.scannedBy;
        
        return [
            `"${record.registration?.ticket?.ticketId || 'N/A'}"`,
            `"${participant.firstName} ${participant.lastName}"`,
            `"${participant.email}"`,
            `"${record.scannedAt ? record.scannedAt.toISOString() : ''}"`,
            `"${scannedBy ? `${scannedBy.firstName} ${scannedBy.lastName}` : ''}"`,
            `"${record.scanMethod || ''}"`,
            `"${record.status}"`,
            `"${record.notes || record.manualOverrideReason || record.rejectionReason || ''}"`
        ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${event.eventName}_${new Date().toISOString().split('T')[0]}.csv"`);

    res.send(csv);
});

module.exports = {
    scanQRCode,
    getEventAttendance,
    manualOverride,
    exportAttendanceCSV
};
