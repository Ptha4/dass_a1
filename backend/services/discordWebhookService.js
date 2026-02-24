const axios = require('axios');

class DiscordWebhookService {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.enabled = !!this.webhookUrl;
    }

    /**
     * Post a new event announcement to Discord
     * @param {Object} eventData - Event information
     * @param {Object} organizerInfo - Organizer information
     */
    async postNewEvent(eventData, organizerInfo) {
        if (!this.enabled) {
            console.log('Discord webhook not configured. Skipping event announcement.');
            return;
        }

        try {
            const embed = this.createEventEmbed(eventData, organizerInfo);
            
            const payload = {
                username: 'Event System',
                avatar_url: 'https://cdn.discordapp.com/attachments/818770932174422086/818770936812890185/logo.png',
                embeds: [embed]
            };

            console.log('=== DISCORD WEBHOOK DEBUG ===');
            console.log('Webhook URL:', this.webhookUrl ? 'Configured' : 'Not configured');
            console.log('Event:', eventData.eventName);
            console.log('Organizer:', organizerInfo.firstName);

            const response = await axios.post(this.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Event successfully posted to Discord');
            console.log('Discord response:', response.status);
            return { success: true, status: response.status };

        } catch (error) {
            console.error('❌ Error posting to Discord:', error.message);
            console.error('Error details:', error.response?.data);
            
            // Don't throw error to avoid breaking event creation
            return { 
                success: false, 
                error: error.message,
                details: error.response?.data 
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
        if (!this.enabled) {
            return { success: false, error: 'Webhook not configured' };
        }

        try {
            const testPayload = {
                username: 'Event System',
                content: '🧪 **Webhook Test** - Discord integration is working correctly!'
            };

            const response = await axios.post(this.webhookUrl, testPayload);
            return { success: true, status: response.status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if webhook is configured
     */
    isConfigured() {
        return this.enabled;
    }
}

module.exports = DiscordWebhookService;
