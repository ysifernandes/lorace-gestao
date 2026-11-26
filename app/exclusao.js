(function () {
  var code = new URLSearchParams(location.search).get('pedido');
  var el = document.getElementById('status');
  if (!code || !el) return;
  el.textContent = 'Consultando o pedido ' + code + '…';
  fetch('https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social/data-deletion-status?code=' + encodeURIComponent(code))
    .then(function (r) { return r.json(); })
    .then(function (j) {
      el.textContent = j.status === 'done'
        ? 'Pedido ' + code + ': concluído' + (j.done_at ? ' em ' + new Date(j.done_at).toLocaleString('pt-BR') : '') + '. Os dados do Instagram ligados a esta conta foram apagados do Bloom.'
        : 'Não encontramos o pedido ' + code + '. Confira o código ou fale com a gente.';
    })
    .catch(function () { el.textContent = 'Não consegui consultar agora. Tente de novo em instantes.'; });
})();
