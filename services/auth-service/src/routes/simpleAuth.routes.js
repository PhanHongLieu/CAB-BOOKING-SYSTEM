const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const router = express.Router();

const usersByEmail = new Map();

function getAccessSecret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-simple-auth-secret';
}

function normalizeRole(inputRole) {
    const role = String(inputRole || 'driver').trim().toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'customer') return 'customer';
    return 'driver';
}

function issueAccessToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            type: 'access',
        },
        getAccessSecret(),
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '24h' }
    );
}

function toUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
    };
}

router.post('/register', async (req, res) => {
    const { email, password, role, name, phone, firstName, lastName, phoneNumber } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'email and password are required',
        });
    }

    const emailKey = String(email).trim().toLowerCase();
    if (usersByEmail.has(emailKey)) {
        return res.status(409).json({
            success: false,
            error: 'User already exists',
        });
    }

    const user = {
        id: crypto.randomUUID(),
        email: emailKey,
        passwordHash: await bcrypt.hash(String(password), 10),
        role: normalizeRole(role),
        name: name || [firstName, lastName].filter(Boolean).join(' ').trim() || emailKey.split('@')[0],
        phone: phone || phoneNumber || '',
    };

    usersByEmail.set(emailKey, user);

    const accessToken = issueAccessToken(user);
    return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            user: toUserResponse(user),
            accessToken,
        },
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const emailKey = String(email || '').trim().toLowerCase();
    const user = usersByEmail.get(emailKey);

    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
        });
    }

    const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
    if (!ok) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
        });
    }

    const accessToken = issueAccessToken(user);
    return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: toUserResponse(user),
            accessToken,
        },
    });
});

router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization header required',
        });
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, getAccessSecret());
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                },
            },
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
    }
});

module.exports = router;
