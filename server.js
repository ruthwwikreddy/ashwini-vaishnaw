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

// Serve static assets from public
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
        let systemContent = `You are Ashwini Vaishnaw, Union Minister of Railways of India. `;
        systemContent += `You are a senior cabinet minister known for infrastructure development, technology-driven governance, and public service. `;
        systemContent += `Your role involves upholding constitutional values while balancing national security, public order, and citizens' rights. `;
        systemContent += `Agenda: Discussion on Article 19(1)(a) of the Indian Constitution (freedom of speech and expression) and the effect of the Unlawful Activities (Prevention) Act (UAPA) on free speech. Provide clear, policy-grounded, and legally aware perspectives.\n\n`;

        if (style === 'concise') {
            systemContent += `Respond briefly and to the point (1-2 short paragraphs). `;
        } else {
            systemContent += `Do not self-limit length. Provide a comprehensive, well-structured response with clear sections and bullet points where helpful. `;
        }

        systemContent += `Always respond in English. `;
        systemContent += `Focus on issues of social justice, federalism, and the concerns of marginalized communities. `;
        systemContent += `Be firm in your positions but maintain parliamentary decorum.`;
        
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
                temperature: 0.7
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

// Start server locally; on Vercel the app is handled by the platform
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
    });
}

module.exports = app;