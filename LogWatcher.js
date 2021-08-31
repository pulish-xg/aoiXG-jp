async function StartLogWatching(path) {
    return new Promise((resolve, reject) => {
        if (path.indexOf('%d/') >= 0) {
            const path1 = path.replace('%d/', '1/Log/');
            const path2 = path.replace('%d/', '2/Log/');
            const path3 = path.replace('%d/', '3/Log/');

            if (!fs.existsSync(path1)) {
                reject(`[data/config.json] BlueCG.user で\n指定されたフォルダ [${path1}]\nが見つかりませんでした`);
                return;
            }
            fs.watch(path1, LogUpdate.bind(null, 1, path1));
            console.debug(`Watch start ${path1}`);

            if (fs.existsSync(path2)) {
                fs.watch(path2, LogUpdate.bind(null, 2, path2));
                console.debug(`Watch start ${path2}`);
            }
            if (fs.existsSync(path3)) {
                fs.watch(path3, LogUpdate.bind(null, 3, path3));
                console.debug(`Watch start ${path3}`);
            }
        } else {
            const path1 = path + 'Log/';
            if (!fs.existsSync(path)) {
                reject(`[data/config.json] BlueCG.user で\n指定されたフォルダ [${path1}]\nが見つかりませんでした`);
                return;
            }
            fs.watch(path1, LogUpdate.bind(null, 1, path1));
            console.debug(`Watch start ${path1}`);
        }
        resolve();
    });
}

const fileDesc = {};
const lastSize = {};
let      = "";

function LogUpdate(user, folder, type, file) {
    console.log(`[Log file update] user=${user} [${folder}${file}] ${type}.`)
    const path = `${folder}${file}`;

    try {
        const newSize = fs.statSync(path).size;
        console.log(`[${path}] size ${newSize}`);
        if (!fileDesc[path]) {
            const fd = fs.openSync(path);
            fileDesc[path] = fd;
            lastSize[path] = 0;
        }
        const readStartPos = lastSize[path];
        if (newSize == readStartPos)
            return;
        const updateLen = newSize - readStartPos;
        console.log(`[${path}] readStart ${readStartPos}`);
        lastSize[path] = newSize;

        const buf = new Uint8Array(65536);
        fs.read(fileDesc[path], buf, 0, buf.byteLength, readStartPos, (err, byteRead, buffer) => {
            if (err) {
                console.log("err: ${err}");
            }
            if (updateLen != byteRead) {
                const curSize = fs.statSync(path).size;
                console.warn(`missMatch ${updateLen} != ${byteRead} / newSize = ${newSize} | curSize = ${curSize}`);
            }
            console.log(`[${path}] read ${byteRead}`);
            lastChat = decodeBig5Ex(buffer.subarray(0, byteRead));
            let $lastDiv = null;
            for (let line of lastChat.replace(/[\r\n]+/, '\n').split('\n')) {
                if (line.match(/^\s*$/))
                    continue;
                const m = line.match(/^ ?(\d\d:\d\d:\d\d)丗(?:([^:]+):\s*)?(\S.*)/);
                if (m) {
                    const time = m[1];
                    const npc = m[2]
                    const msg = m[3];
                    lastChat = msg;
                    console.log(msg);
                    let logText = (npc ? `${npc}：` : '') + `${msg}`;

                    let mm;
                    mm = msg.match(/^(.+)加入了您的隊伍。$/);
                    if (mm) {
                        logText = `${mm[1]} がパーティに加わった`;
                    }
                    mm = msg.match(/^(.+)的個人簡介設定為不公開。$/);
                    if (mm) {
                        logText = `${mm[1]} はプロフィールを公開していません`;
                    }
                    const $div = $('<div>').appendTo($boxChatLog[user]);
                    const $input = $('<input>').val(logText).css({ width: '100%', border: 'none', "background-color": 'transparent' }).appendTo($div);
                    $lastDiv = $div;
                } else {
                    const $div = $('<div>').appendTo($boxChatLog[user]);
                    let logText = line;
                    const $input = $('<input>').val(logText).css({ width: '100%', border: 'none', "background-color": 'transparent' });
                    $lastDiv = $div;
                }
            }
            if ($lastDiv) {
                $lastDiv.get(0).scrollIntoView({ block: "end", inline: "nearest", behavior: "smooth" })
            }
        });
    } catch {
        // path が無い
        return;
    }


}

function decodeBig5Ex(line) { // line: { encoding: binary } string
    let len = line.byteLength;
    const utf16 = new Uint8Array(len * 2);
    let pos = 0;
    let idx = 0;
    while (idx < len) {
        const c1 = line[idx++];
        if (c1 < 0x80) {
            utf16[pos++] = 0;
            utf16[pos++] = c1;
        } else {
            const c2 = line[idx++];
            const cc = ((c1 - 0x80) * (0x100 - 0x40) + (c2 - 0x40)) * 2;
            utf16[pos++] = big5_u16LE[cc + 1];
            utf16[pos++] = big5_u16LE[cc + 0];
        }
    }
    const decoder = new TextDecoder('UTF-16BE');
    return decoder.decode(utf16.subarray(0, pos));
}