
const express = require('express');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

const router = express.Router();

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET en az 32 karakter olmalı.');
    }

    return secret;
}

function isValidEmail(email) {
    return (
        typeof email === 'string' &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

function isStrongPassword(password) {
    return (
        typeof password === 'string' &&
        Buffer.byteLength(password, 'utf8') <= 1024 &&
        password.length >= 12 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

function createToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
        },
        getJwtSecret(),
        {
            expiresIn: '1h',
            algorithm: 'HS256',
        }
    );
}

// Kayıt
router.post('/register', async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        const { fullName, email, password } = req.body || {};

        if (
            typeof fullName !== 'string' ||
            !fullName.trim() ||
            fullName.trim().length > 100
        ) {
            return res.status(400).json({
                error: 'Ad soyad zorunludur ve 100 karakteri aşamaz.',
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi girin.',
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error:
                    'Parola en az 12 karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermeli.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
        });

        const result = await db.query(
            `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email`,
            [fullName.trim(), normalizedEmail, passwordHash]
        );

        const user = result.rows[0];
        const token = createToken(user);

        return res.status(201).json({
            message: 'Kayıt başarılı.',
            token,
            tokenType: 'Bearer',
            expiresIn: 3600,
            user,
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Bu e-posta adresi zaten kayıtlı.',
            });
        }

        return next(error);
    }
});

// Giriş
router.post('/login', async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        const { email, password } = req.body || {};

        if (
            !isValidEmail(email) ||
            typeof password !== 'string' ||
            !password ||
            Buffer.byteLength(password, 'utf8') > 1024
        ) {
            return res.status(400).json({
                error: 'E-posta veya parola biçimi geçersiz.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await db.query(
            `SELECT id, full_name, email, password_hash
       FROM users
       WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'E-posta veya parola hatalı.',
            });
        }

        const user = result.rows[0];

        const passwordMatches = await argon2.verify(
            user.password_hash,
            password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: 'E-posta veya parola hatalı.',
            });
        }

        const token = createToken(user);

        return res.json({
            message: 'Giriş başarılı.',
            token,
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
            },
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
