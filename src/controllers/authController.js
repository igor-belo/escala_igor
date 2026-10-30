const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { signToken, setTokenCookie, clearTokenCookie } = require("../core");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.login = async (req, res) => {
  try {
    const { identificador, senha } = req.body;
    const resUser = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1 OR login = $1",
      [identificador],
    );
    if (resUser.rows.length === 0)
      return res.status(401).json({ erro: "Usuário não encontrado" });
    const usuario = resUser.rows[0];
    if (usuario.ativo === false)
      return res
        .status(403)
        .json({ erro: "Usuário inativo. Procure o administrador." });
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });
    const usuarioFront = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      login: usuario.login,
      tipo_perfil: usuario.tipo_perfil,
      setor_id: usuario.setor_id,
      primeiro_acesso: usuario.primeiro_acesso
    };

    const token = signToken({ id: usuario.id, email: usuario.email, tipo_perfil: usuario.tipo_perfil });

    setTokenCookie(res, token);
    res.json({ sucesso: true, usuario: usuarioFront });
  } catch (erro) {
    console.log("ERRO REAL NO LOGIN:", erro);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};
exports.alterarSenha = async (req, res) => {
  try {
    const { id, novaSenha } = req.body;
    const senhaCripto = await bcrypt.hash(novaSenha, 10);
    await pool.query(
      "UPDATE usuarios SET senha = $1, primeiro_acesso = false WHERE id = $2",
      [senhaCripto, id],
    );
    const token = signToken({ id, email: req.body.email || 'unknown', tipo_perfil: 'unknown' });
    setTokenCookie(res, token);
    res.json({ sucesso: true });
  } catch (erro) {
    console.log("ERRO AO ALTERAR SENHA:", erro);
    res.status(500).json({ erro: "Erro ao alterar a senha" });
  }
};

exports.loginGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!googleRes.ok) {
      return res.status(401).json({ erro: "Token do Google inválido ou expirado" });
    }

    const tokenInfo = await googleRes.json();
    const email = tokenInfo.email;

    const resUser = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    
    if (resUser.rows.length === 0) {
      return res.status(401).json({ erro: "Usuário não cadastrado no sistema. Solicite acesso ao administrador." });
    }

    const usuario = resUser.rows[0];

    if (usuario.ativo === false) {
      return res.status(403).json({ erro: "Usuário inativo. Procure o administrador." });
    }

    const usuarioFront = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      login: usuario.login,
      tipo_perfil: usuario.tipo_perfil,
      setor_id: usuario.setor_id,
      primeiro_acesso: usuario.primeiro_acesso
    };

    const jwtToken = signToken({ id: usuario.id, email: usuario.email, tipo_perfil: usuario.tipo_perfil });

    setTokenCookie(res, jwtToken);
    res.json({ sucesso: true, usuario: usuarioFront });
  } catch (erro) {
    console.log("ERRO REAL NO LOGIN GOOGLE:", erro);
    res.status(500).json({ erro: "Erro ao autenticar com o Google" });
  }
};

exports.logout = (req, res) => {
  clearTokenCookie(res);
  res.json({ sucesso: true });
};
