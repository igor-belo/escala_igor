const { verifyToken } = require('../core');

module.exports = (req, res, next) => {
    let token = req.cookies && req.cookies.auth_token;
    
    if (!token) {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decoded = verifyToken(token);
        req.usuario_logado = decoded;
        next();
    } catch (e) {
        return res.status(403).json({ erro: 'Token inválido ou expirado.' });
    }
};
