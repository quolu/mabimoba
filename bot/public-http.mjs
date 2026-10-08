export function createPublicHandler({ ready, invite, guildCount }) {
  return (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method !== 'GET' || !['/healthz', '/invite', '/stats'].includes(path)) return false;
    const connected = ready();
    if (path === '/healthz') {
      response.writeHead(connected ? 200 : 503);
      response.end(JSON.stringify({ status: connected ? 'ok' : 'connecting' }));
    } else if (path === '/invite') {
      response.writeHead(connected ? 302 : 503, connected ? { Location: invite() } : {});
      response.end();
    } else {
      response.writeHead(connected ? 200 : 503);
      response.end(JSON.stringify(connected ? { guildCount: guildCount() } : { error: 'DISCORD_NOT_READY' }));
    }
    return true;
  };
}
