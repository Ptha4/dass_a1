const axios = require('axios');

class DiscordWebhookService {
    constructor(organizerWebhookUrl = null) {
        // Support for club-specific webhooks
        this.organizerWebhookUrl = organizerWebhookUrl;
        this.globalWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.enabled = !!(this.organizerWebhookUrl || this.globalWebhookUrl);
    }

    /**
     * Post a new event announcement to Discord
     * @param {Object} eventData - Event information
     * @param {Object} organizerInfo - Organizer information
     */
    async postNewEvent(eventData, organizerInfo) {
        console.log('=== DISCORD WEBHOOK SERVICE DEBUG ===');
        console.log('Club webhook URL:', this.discordWebhookUrl ? 'CONFIGURED' : 'NOT CONFIGURED');
        console.log('Global webhook URL:', this.globalWebhookUrl ? 'CONFIGURED' : 'NOT CONFIGURED');
        console.log('Service enabled:', this.enabled);
        
        if (!this.enabled) {
            console.log('⚠️ Discord webhook not configured. Skipping event announcement.');
            console.log('To enable: Set DISCORD_WEBHOOK_URL globally or add club-specific webhook');
            console.log('=== END DISCORD SERVICE DEBUG ===');
            return { success: false, skipped: true, error: 'Discord webhook not configured' };
        }

        try {
            console.log('🔨 Creating Discord embed for event...');
            const embed = this.createEventEmbed(eventData, organizerInfo);
            console.log('✅ Embed created successfully');
            console.log('Embed title:', embed.title);
            console.log('Embed color:', embed.color);
            console.log('Embed field count:', embed.fields?.length || 0);
            
            const webhookUrl = this.organizerWebhookUrl || this.globalWebhookUrl;
            const webhookType = this.organizerWebhookUrl ? 'CLUB-SPECIFIC' : 'GLOBAL';
            
            const payload = {
                username: 'Event System',
                avatar_url: 'https://cdn.discordapp.com/attachments/818770932174422086/818770936812890185/logo.png',
                embeds: [embed]
            };
            
            console.log('📤 Preparing to send payload to Discord...');
            console.log('Payload size:', JSON.stringify(payload).length, 'characters');
            console.log('Webhook type:', webhookType);
            console.log('Webhook URL (first 50 chars):', webhookUrl.substring(0, 50) + '...');

            console.log('🚀 Sending HTTP request to Discord...');
            const startTime = Date.now();
            
            const response = await axios.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Event-Management-System/1.0'
                },
                timeout: 10000 // 10 second timeout
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            console.log('✅ Discord API response received');
            console.log('Response status:', response.status);
            console.log('Response status text:', response.statusText);
            console.log('Response time:', responseTime, 'ms');
            console.log('Response headers:', response.headers);
            
            if (response.status >= 200 && response.status < 300) {
                console.log('🎉 Event successfully posted to Discord!');
                console.log('Discord message ID:', response.headers?.['x-discord-message-id'] || 'Unknown');
                console.log('Webhook type used:', webhookType);
            } else {
                console.error('❌ Discord API returned error status');
                console.error('Status:', response.status);
                console.error('Status text:', response.statusText);
                console.error('Response data:', response.data);
            }

            console.log('=== END DISCORD SERVICE DEBUG ===');
            return { success: true, status: response.status, responseTime, webhookType };

        } catch (error) {
            console.error('❌ DISCORD WEBHOOK ERROR ===');
            console.error('Error occurred while posting to Discord');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            
            if (error.code) {
                console.error('Error code:', error.code);
            }
            
            if (error.response) {
                console.error('HTTP Status:', error.response.status);
                console.error('HTTP Status Text:', error.response.statusText);
                console.error('Response Data:', error.response.data);
                console.error('Response Headers:', error.response.headers);
            }
            
            if (error.request) {
                console.error('Request made but no response received');
                console.error('Request URL:', error.config?.url);
                console.error('Request method:', error.config?.method);
                console.error('Request headers:', error.config?.headers);
            }
            
            console.error('Full error object:', error);
            console.error('=== END DISCORD ERROR DEBUG ===');
            
            // Don't throw error to avoid breaking event creation
            return { 
                success: false, 
                error: error.message,
                code: error.code,
                responseStatus: error.response?.status,
                responseData: error.response?.data
            };
        }
    }

    /**
     * Create Discord embed for event announcement
     * @param {Object} eventData - Event information
     * @param {Object} organizerInfo - Organizer information
     * @returns {Object} Discord embed object
     */
    createEventEmbed(eventData, organizerInfo) {
        const now = new Date();
        const eventStart = new Date(eventData.eventStartDate);
        const registrationDeadline = new Date(eventData.registrationDeadline);

        // Determine color based on event type
        const colors = {
            'normal': 0x0099ff,      // Blue
            'merch': 0x00ff88,       // Green
            'ticket': 0xff9900,      // Orange
            'workshop': 0x9933ff,     // Purple
            'competition': 0xff3366   // Red
        };
        
        const color = colors[eventData.eventType?.toLowerCase()] || colors.normal;

        // Create description
        let description = eventData.eventDescription || 'No description available';
        if (description.length > 1000) {
            description = description.substring(0, 1000) + '...';
        }

        // Create fields
        const fields = [
            {
                name: '📅 Event Date',
                value: eventStart.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                inline: true
            },
            {
                name: '⏰ Registration Deadline',
                value: registrationDeadline.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                inline: true
            },
            {
                name: '📍 Location',
                value: eventData.location || 'TBD',
                inline: true
            }
        ];

        // Add eligibility if specified
        if (eventData.eligibility && eventData.eligibility !== 'Open to all') {
            fields.push({
                name: '👥 Eligibility',
                value: eventData.eligibility,
                inline: true
            });
        }

        // Add pricing information
        if (eventData.eventType === 'merch') {
            fields.push({
                name: '🛍️ Type',
                value: 'Merchandise Event',
                inline: true
            });
            
            if (eventData.items && eventData.items.length > 0) {
                const itemPrices = eventData.items.map(item => 
                    `${item.itemName}: ₹${item.price || 0}`
                ).slice(0, 3);
                
                fields.push({
                    name: '💰 Items Available',
                    value: itemPrices.join('\n'),
                    inline: false
                });
            }
        } else if (eventData.registrationFee && eventData.registrationFee > 0) {
            fields.push({
                name: '💰 Registration Fee',
                value: `₹${eventData.registrationFee}`,
                inline: true
            });
        } else {
            fields.push({
                name: '💰 Registration Fee',
                value: 'Free',
                inline: true
            });
        }

        // Add organizer information
        const organizerName = organizerInfo.firstName && organizerInfo.lastName 
            ? `${organizerInfo.firstName} ${organizerInfo.lastName}`
            : organizerInfo.firstName || 'Unknown';

        fields.push({
            name: '🎯 Organizer',
            value: organizerName,
            inline: true
        });

        // Add club interest if available
        if (organizerInfo.clubInterest && organizerInfo.clubInterest !== 'others') {
            fields.push({
                name: '🏷️ Club',
                value: organizerInfo.clubInterest,
                inline: true
            });
        }

        // Create embed object
        const embed = {
            title: `🎉 New Event: ${eventData.eventName}`,
            description: description,
            color: color,
            fields: fields,
            timestamp: now.toISOString(),
            footer: {
                text: 'Event Management System • Auto-generated announcement'
            }
        };

        // Add thumbnail if available
        if (eventData.eventImage) {
            embed.thumbnail = {
                url: eventData.eventImage
            };
        }

        return embed;
    }

    /**
     * Test webhook connection
     */
    async testConnection() {
        console.log('=== DISCORD WEBHOOK TEST DEBUG ===');
        console.log('Club webhook URL:', this.organizerWebhookUrl ? 'CONFIGURED' : 'NOT CONFIGURED');
        console.log('Global webhook URL:', this.globalWebhookUrl ? 'CONFIGURED' : 'NOT CONFIGURED');
        console.log('Service enabled:', this.enabled);
        
        if (!this.enabled) {
            console.log('❌ Cannot test - No Discord webhook configured');
            console.log('To enable: Set DISCORD_WEBHOOK_URL globally or add club-specific webhook');
            console.log('=== END DISCORD TEST DEBUG ===');
            return { success: false, error: 'No webhook configured' };
        }

        try {
            console.log('🧪 Testing Discord webhook connection...');
            
            const webhookUrl = this.organizerWebhookUrl || this.globalWebhookUrl;
            const webhookType = this.organizerWebhookUrl ? 'CLUB-SPECIFIC' : 'GLOBAL';
            
            const testPayload = {
                username: 'Event System Test',
                content: `🧪 **Webhook Test** - Discord integration is working correctly!\n\n**Webhook Type:** ${webhookType}`,
                embeds: [{
                    title: 'Connection Test',
                    description: `This is a test message to verify Discord webhook connectivity.\n\n**Webhook Type:** ${webhookType}\n**Webhook URL:** ${webhookUrl.substring(0, 50)}...`,
                    color: 0x00ff00, // Green
                    timestamp: new Date().toISOString()
                }]
            };

            console.log('📤 Sending test payload to Discord...');
            console.log('Test payload size:', JSON.stringify(testPayload).length, 'characters');
            console.log('Webhook type being tested:', webhookType);
            
            const startTime = Date.now();
            
            const response = await axios.post(webhookUrl, testPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Event-Management-System/1.0-Test'
                },
                timeout: 10000
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            console.log('✅ Test response received from Discord');
            console.log('Response status:', response.status);
            console.log('Response status text:', response.statusText);
            console.log('Response time:', responseTime, 'ms');

            if (response.status >= 200 && response.status < 300) {
                console.log('🎉 Discord webhook test successful!');
                console.log('Test message should appear in your Discord channel');
                console.log('Webhook type tested:', webhookType);
                console.log('=== END DISCORD TEST DEBUG ===');
                return { success: true, status: response.status, responseTime, webhookType };
            } else {
                console.error('❌ Discord webhook test failed');
                console.error('Status:', response.status);
                console.error('Status text:', response.statusText);
                console.error('Response data:', response.data);
                console.log('=== END DISCORD TEST DEBUG ===');
                return { success: false, error: `HTTP ${response.status}: ${response.statusText}`, webhookType };
            }

        } catch (error) {
            console.error('❌ DISCORD TEST ERROR ===');
            console.error('Error occurred during webhook test');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            
            if (error.code) {
                console.error('Error code:', error.code);
                console.error('Error description:', this.getErrorCodeDescription(error.code));
            }
            
            if (error.response) {
                console.error('HTTP Status:', error.response.status);
                console.error('HTTP Status Text:', error.response.statusText);
                console.error('Response Data:', error.response.data);
            }
            
            if (error.request) {
                console.error('Request made but no response received');
                console.error('Request timeout or network error');
            }
            
            console.error('=== END DISCORD TEST ERROR ===');
            return { success: false, error: error.message, code: error.code };
        }
    }

    /**
     * Check if webhook is configured
     */
    isConfigured() {
        return this.enabled && (this.organizerWebhookUrl || this.globalWebhookUrl);
    }

    /**
     * Get webhook configuration details
     */
    getWebhookInfo() {
        return {
            enabled: this.enabled,
            hasClubWebhook: !!this.organizerWebhookUrl,
            hasGlobalWebhook: !!this.globalWebhookUrl,
            clubWebhookUrl: this.organizerWebhookUrl ? this.organizerWebhookUrl.substring(0, 50) + '...' : null,
            globalWebhookUrl: this.globalWebhookUrl ? this.globalWebhookUrl.substring(0, 50) + '...' : null,
            webhookType: this.organizerWebhookUrl ? 'CLUB-SPECIFIC' : 'GLOBAL'
        };
    }

    /**
     * Get error code description
     * @param {string} errorCode - Error code from axios error
     * @returns {string} - Human readable error description
     */
    getErrorCodeDescription(errorCode) {
        const errorDescriptions = {
            'ENOTFOUND': 'Network address not found',
            'ECONNREFUSED': 'Connection refused by server',
            'ETIMEDOUT': 'Connection timed out',
            'ECONNRESET': 'Connection was reset',
            'ECONNABORTED': 'Connection was aborted',
            'EHOSTUNREACH': 'Host is unreachable',
            'EPROTO': 'Protocol error',
            'EAI_AGAIN': 'DNS lookup failed temporarily',
            'EAI_NODATA': 'No address associated with hostname',
            'EAI_NONAME': 'Hostname not found',
            'EAI_BADHINTS': 'Invalid DNS hints',
            'EAI_BADFLAGS': 'Invalid DNS flags',
            'EAI_FAMILY': 'Unsupported address family'
        };
        
        return errorDescriptions[errorCode] || `Unknown error code: ${errorCode}`;
    }
}

module.exports = DiscordWebhookService;
