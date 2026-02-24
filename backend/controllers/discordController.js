const DiscordWebhookService = require('../services/discordWebhookService');

// @desc    Test Discord webhook connection
// @route   POST /api/admin/discord-test
// @access  Private/Admin
const testDiscordWebhook = async (req, res) => {
    try {
        // Get organizer webhook URL from request body or use global fallback
        const organizerWebhookUrl = req.body.organizerWebhookUrl;
        const discordService = new DiscordWebhookService(organizerWebhookUrl);
        
        if (!discordService.isConfigured()) {
            return res.status(400).json({ 
                message: 'Discord webhook not configured. Please provide a valid webhook URL.',
                configured: false,
                webhookInfo: discordService.getWebhookInfo()
            });
        }

        const result = await discordService.testConnection();
        
        if (result.success) {
            res.json({ 
                message: 'Discord webhook test successful!',
                configured: true,
                status: result.status,
                responseTime: result.responseTime,
                webhookType: result.webhookType,
                webhookInfo: discordService.getWebhookInfo()
            });
        } else {
            res.status(400).json({ 
                message: 'Discord webhook test failed',
                configured: true,
                error: result.error,
                webhookType: result.webhookType,
                webhookInfo: discordService.getWebhookInfo()
            });
        }
    } catch (error) {
        console.error('Discord test error:', error);
        res.status(500).json({ 
            message: 'Internal server error during webhook test',
            error: error.message 
        });
    }
};

// @desc    Get Discord webhook configuration status
// @route   GET /api/admin/discord-status
// @access  Private/Admin
const getDiscordStatus = async (req, res) => {
    try {
        // Get organizer webhook URL from query parameter or use global fallback
        const organizerWebhookUrl = req.query.organizerWebhookUrl;
        const discordService = new DiscordWebhookService(organizerWebhookUrl);
        const webhookInfo = discordService.getWebhookInfo();
        
        res.json({
            configured: discordService.isConfigured(),
            webhookInfo: webhookInfo
        });
    } catch (error) {
        console.error('Discord status check error:', error);
        res.status(500).json({ 
            message: 'Internal server error during status check',
            error: error.message 
        });
    }
};

module.exports = {
    testDiscordWebhook,
    getDiscordStatus
};
