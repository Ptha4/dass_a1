const DiscordWebhookService = require('../services/discordWebhookService');

// @desc    Test Discord webhook connection
// @route   POST /api/admin/discord-test
// @access  Private/Admin
const testDiscordWebhook = async (req, res) => {
    try {
        const discordService = new DiscordWebhookService();
        
        if (!discordService.isConfigured()) {
            return res.status(400).json({ 
                message: 'Discord webhook not configured. Please set DISCORD_WEBHOOK_URL in your environment variables.',
                configured: false
            });
        }

        const result = await discordService.testConnection();
        
        if (result.success) {
            res.json({ 
                message: 'Discord webhook test successful!',
                configured: true,
                status: result.status
            });
        } else {
            res.status(400).json({ 
                message: 'Discord webhook test failed',
                configured: true,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Discord webhook test error:', error);
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
    const discordService = new DiscordWebhookService();
    
    res.json({
        configured: discordService.isConfigured(),
        webhookUrl: discordService.webhookUrl ? '***configured***' : 'not configured'
    });
};

module.exports = {
    testDiscordWebhook,
    getDiscordStatus
};
