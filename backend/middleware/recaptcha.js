const axios = require('axios');

// Custom reCAPTCHA verification
const verifyRecaptcha = async (req, res, next) => {
    console.log('reCAPTCHA middleware called');
    console.log('Request body:', req.body);
    
    const { recaptchaToken } = req.body;
    
    if (!recaptchaToken) {
        console.log('No recaptchaToken found in request body');
        return res.status(400).json({
            message: 'CAPTCHA verification required. Please complete the reCAPTCHA challenge.'
        });
    }

    console.log('recaptchaToken found:', recaptchaToken);

    // Check if it's a test token (for development)
    if (recaptchaToken.startsWith('test-token-') && process.env.RECAPTCHA_SECRET_KEY === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4wifDy') {
        console.log('Using test reCAPTCHA token - bypassing verification for development');
        return next();
    }

    try {
        // Verify the token with Google
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: recaptchaToken
                }
            }
        );

        const data = response.data;

        if (!data.success) {
            return res.status(400).json({
                message: 'CAPTCHA verification failed. Please try again.'
            });
        }

        // Check score threshold (for v3, typically 0.5 is good)
        if (data.score !== undefined && data.score < 0.5) {
            return res.status(400).json({
                message: 'CAPTCHA verification failed. Suspicious activity detected.'
            });
        }

        // CAPTCHA verification successful
        next();
    } catch (error) {
        console.error('reCAPTCHA verification failed:', error);
        return res.status(400).json({
            message: 'CAPTCHA verification failed. Please try again.'
        });
    }
};

// Middleware to render reCAPTCHA script and widget
const renderRecaptcha = (req, res, next) => {
    res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    next();
};

module.exports = {
    verifyRecaptcha,
    renderRecaptcha
};
