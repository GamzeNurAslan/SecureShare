
const jwt = require('jsonwebtoken');

function isUuid(value) {
    return typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function authMiddleware(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Giriş yapmanız gerekiyor.',
        });
    }

    const token = authorization.slice(7).trim();

    if (!token || !process.env.JWT_SECRET) {
        return res.status(401).json({
            error: 'Geçersiz kimlik doğrulama bilgisi.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });

        if (
            typeof decoded === 'string' ||
            !isUuid(decoded.sub)
        ) {
            return res.status(401).json({
                error: 'Token içindeki kullanıcı kimliği geçersiz.',
            });
        }

        req.user = {
            id: decoded.sub,
            email: decoded.email,
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token geçersiz veya süresi dolmuş.',
        });
    }
}

module.exports = authMiddleware;
