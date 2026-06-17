import { ConversationState } from './aiBrain';

export function generateIntroMessage(lead: any): string {
    const savings = Math.round(lead.estimated_savings || 0).toLocaleString();
    const industry = lead.industry || 'businesses like yours';
    
    return `Hey there,

I was reviewing energy usage patterns for ${industry} in ${lead.city} and noticed something interesting.

Based on your facility size and industry, you're likely overpaying by around $${savings} annually.

Worth a quick look?`;
}

export function generateObjectionResponse(objection: string, lead: any): string {
    const savings = Math.round(lead.estimated_savings || 0).toLocaleString();
    
    if (objection.includes('not interested')) {
        return `Totally fair.

Out of curiosity—are you currently locked into a contract, or just not seeing $${savings} worth switching?

We've seen a lot of restaurant owners surprised lately.`;
    }
    
    if (objection.includes('too expensive')) {
        return `I hear you. That's actually why I reached out—you're currently overpaying.

Our whole value prop is saving you money, not costing more.

Want me to prove it?`;
    }
    
    if (objection.includes('busy')) {
        return `No worries. When's a better time to connect? 

I can make this quick—promise.`;
    }
    
    return `I understand. Would you be open to a 2-minute breakdown of the numbers? No obligation.`;
}

export function generateFollowUp(
    lead: any,
    options: number | { daysSince: number; stage: any; sentiment: any }
): string {
    const daysSince = typeof options === 'number' ? options : options.daysSince;
    const savings = Math.round(lead.estimated_savings || 0).toLocaleString();
    
    if (daysSince < 3) {
        return `Quick heads up—rates shifted this week.

That $${savings} estimate may actually be higher now.

Want me to check?`;
    }
    
    if (daysSince < 7) {
        return `Just circling back on this. Still interested in seeing if we can save you money?`;
    }
    
    return `Following up one last time. If you're not interested, just say the word and I'll close the loop.`;
}

export function generateClosingMessage(lead: any): string {
    const savings = Math.round(lead.estimated_savings || 0).toLocaleString();
    
    return `Great! I can lock this rate in for you in about 3 minutes.

Want me to send the enrollment link?

Lock in $${savings} annual savings →`;
}