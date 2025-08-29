require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors({
    origin: '*',  // In production, replace with your frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, 'public')));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, style = 'concise' } = req.body;
        
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message provided');
        }

        // Build system prompt based on style
        let systemContent = `You are Ashwini Vaishnaw, Union Minister in the Government of India. `;
        systemContent += `You are a senior administrator and policymaker focusing on technology, infrastructure, and governance. `;
        systemContent += `You emphasize efficiency, citizen-centric services, and digital transformation. `;
        systemContent += `Maintain a balanced, constructive tone aligned with ministerial responsibility.\n\n`;
        
        if (style === 'concise') {
            systemContent += `Please provide a brief and to-the-point response (1-2 paragraphs). `;
        } else {
            systemContent += `Please provide a detailed and comprehensive response. `;
        }
        
        systemContent += `Always respond in English. `;
        // Agenda focus
        systemContent += `Agenda: Discuss Article 19(1)(a) of the Indian Constitution (freedom of speech and expression) and the effect of the Unlawful Activities (Prevention) Act (UAPA) on this freedom. `;
        systemContent += `Explain the scope of Article 19(1)(a), the permissible restrictions under Article 19(2), and how UAPA provisions interact with these constitutional limits. `;
        systemContent += `Where helpful, reference leading principles and case law (e.g., Shreya Singhal v. Union of India (2015) on advocacy vs. incitement, Kedar Nath Singh (1962) on sedition interpretation, Modern Dental College (2016)/Puttaswamy (2017) proportionality test, and UAPA bail jurisprudence such as Watali (2019) and K.A. Najeeb (2021)). `;
        systemContent += `Maintain balance: acknowledge national security objectives while evaluating chilling effects, overbreadth, vagueness, bail thresholds, and proportionality. `;
        systemContent += `Provide clear, neutral, and policy-focused explanations suited to a public discussion; avoid giving personalized legal advice. `;
        systemContent += `Be firm in your positions but maintain ministerial decorum.`;
        
        console.log('Sending request to OpenAI with style:', style);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemContent },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: style === 'concise' ? 150 : 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error:', response.status, errorText);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Received response from OpenAI:', JSON.stringify(data, null, 2));
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            res.json({ 
                response: data.choices[0].message.content.trim() 
            });
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Unexpected response format from AI service');
        }
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ 
            error: 'I apologize, but I encountered an error. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Serve the main HTML file
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);    
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
});
