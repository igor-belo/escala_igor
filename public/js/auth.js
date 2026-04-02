async function fazerLogin(e) {
    e.preventDefault();
    const identificador = document.getElementById('identificador').value;
    const senha = document.getElementById('senha').value;
    const btn = e.target.querySelector('button');
    const txtOriginal = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Entrando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador, senha })
        });
        
        const data = await res.json();
        if (res.ok) {
            // VOLTOU PARA A CHAVE ORIGINAL:
            localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
            window.location.href = 'index.html'; // Manda pro sistema ao logar!
        } else {
            alert(data.erro);
        }
    } catch (erro) {
        alert("Erro de conexão com o servidor.");
    }
    
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
}

function fazerLogout() {
    // VOLTOU PARA A CHAVE ORIGINAL:
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html'; // Manda pra tela de login ao sair!
}