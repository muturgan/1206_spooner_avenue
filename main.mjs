import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join as joinPath } from 'node:path';

import { Server } from 'socket.io';


const MIME_TYPES = {
	default: 'application/octet-stream',
	html: 'text/html',
	css: 'text/css',
	js: 'text/javascript',
	png: 'image/png',
};

const prepareFile = (url) => {
	let fileName = url === '/'
		? 'index.html'
		: url === '/moderator'
			? 'moderator.html'
			: url;
	const filePath = joinPath(process.cwd(), 'static', fileName);
	const exists = existsSync(filePath);
		if (!exists) {
		return null;
	}
	const ext = extname(filePath).substring(1).toLowerCase();
	const mime = MIME_TYPES[ext] || MIME_TYPES.default;
	const stream = createReadStream(filePath);
	return { mime, stream };
};

const server = createServer(async (req, res) => {
	switch (req.method) {
		case 'GET':
			if (req.url === undefined) {
				res.socket?.destroy();
				return;
			}

			const [url] = req.url.split('?');

			if (url === '/favicon.ico') {
				res.writeHead(204);
				res.end();
				return;
			}

			const file = prepareFile(url);
			if (file === null) {
				res.writeHead(404);
				res.end('Not Found');
				return;
			}

			res.writeHead(200, { 'Content-Type': file.mime });
			file.stream.pipe(res);
			return;

		default:
			res.socket?.destroy();
			return;
	}
});

const io = new Server(server);

io.on('connection', (client) => {
	client.on('change', (data) => {
		io.emit('changed', data);
	});
});

server.listen(Number(process.env.APP_PORT), () => {
	console.info(`Server listening on http://127.0.0.1:${process.env.APP_PORT}`);
});
