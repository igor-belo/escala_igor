const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { signToken, setTokenCookie, clearTokenCookie } = require("../core");
const { registrarLog, extrairInfoRequisicao } = require("../services/auditService");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.login = async (req, res) => {
  const reqInfo = extrairInfoRequisicao(req);
  try {
    const { identificador, senha } = req.body;
    const resUser = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1 OR login = $1",
      [identificador],
    );
    if (resUser.rows.length === 0) {
      // Log de falha de login
      await registrarLog({
        usuario_id: null,
        usuario_nome: identificador,
        acao: 'LOGIN_FALHA',
        detalhes: { motivo: 'Usuário não encontrado' },
        ...reqInfo
      });
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }
    const usuario = resUser.rows[0];
    if (usuario.ativo === false) {
      await registrarLog({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        acao: 'LOGIN_FALHA',
        detalhes: { motivo: 'Usuário inativo' },
        ...reqInfo
      });
      return res
        .status(403)
        .json({ erro: "Usuário inativo. Procure o administrador." });
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      await registrarLog({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        acao: 'LOGIN_FALHA',
        detalhes: { motivo: 'Senha incorreta' },
        ...reqInfo
      });
      return res.status(401).json({ erro: "Senha incorreta" });
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

    const token = signToken({ id: usuario.id, email: usuario.email, tipo_perfil: usuario.tipo_perfil });

    // Log de sucesso de login
    await registrarLog({
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      acao: 'LOGIN_SUCESSO',
      ...reqInfo
    });

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
    
    // Buscar dados completos do usuário para gerar token correto
    const resUser = await pool.query("SELECT nome, email, tipo_perfil FROM usuarios WHERE id = $1", [id]);
    const usuario = resUser.rows[0];
    
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    
    // Log de alteração de senha
    await registrarLog({
      usuario_id: id,
      usuario_nome: usuario.nome,
      acao: 'SENHA_ALTERADA',
      tabela: 'usuarios',
      registro_id: id,
      ...extrairInfoRequisicao(req)
    });
    
    // Gerar token com dados corretos do usuário
    const token = signToken({ 
      id, 
      email: usuario.email, 
      tipo_perfil: usuario.tipo_perfil 
    });
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

exports.logout = async (req, res) => {
  try {
    // Tentar pegar o usuário do token antes de limpar
    if (req.user) {
      await registrarLog({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome || req.user.email,
        acao: 'LOGOUT',
        ...extrairInfoRequisicao(req)
      });
    }
  } catch (e) {
    // Não falhar se o log der erro
  }
  clearTokenCookie(res);
  res.json({ sucesso: true });
};
