import { Hub, encryptPayload, nextAt } from '../push-server/src/index.js';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const b64u=b=>Buffer.from(b).toString('base64url'), unb=s=>new Uint8Array(Buffer.from(s,'base64url'));
// thiết bị nhận giả lập
const ua=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']); const uaPub=new Uint8Array(await crypto.subtle.exportKey('raw',ua.publicKey)); const auth=crypto.getRandomValues(new Uint8Array(16));
const sub={endpoint:'https://web.push.apple.com/abc',keys:{p256dh:b64u(uaPub),auth:b64u(auth)}};
async function hk(salt,ikm,info,len){const k=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},k,len*8));}
const E=new TextEncoder(); const cat=(...a)=>{const o=new Uint8Array(a.reduce((x,y)=>x+y.length,0));let k=0;for(const x of a){o.set(x,k);k+=x.length}return o};
async function decrypt(body){const salt=body.slice(0,16), idlen=body[20], as=body.slice(21,21+idlen), ct=body.slice(21+idlen);
 const asK=await crypto.subtle.importKey('raw',as,{name:'ECDH',namedCurve:'P-256'},false,[]); const sh=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:asK},ua.privateKey,256));
 const ikm=await hk(auth,sh,cat(E.encode('WebPush: info\0'),uaPub,as),32); const cek=await hk(salt,ikm,E.encode('Content-Encoding: aes128gcm\0'),16); const n=await hk(salt,ikm,E.encode('Content-Encoding: nonce\0'),12);
 const k=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']); const pt=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:n},k,ct)); return new TextDecoder().decode(pt.slice(0,-1));}
const enc=await encryptPayload(sub,'{"title":"Hết giờ nghỉ"}'); ok(await decrypt(enc)==='{"title":"Hết giờ nghỉ"}','Mã hoá aes128gcm giải mã đúng (RFC 8291)');
// Durable Object giả lập
const mem=new Map(); let alarmAt=null;
const storage={get:async k=>mem.get(k),put:async(k,v)=>{mem.set(k,structuredClone(v))},delete:async k=>{for(const x of [].concat(k))mem.delete(x)},list:async({prefix,limit})=>{const m=new Map([...mem].filter(([k])=>k.startsWith(prefix)).sort());return m},setAlarm:async t=>{alarmAt=t},deleteAlarm:async()=>{alarmAt=null}};
const sent=[]; globalThis.fetch=async(url,opt)=>{sent.push({url,opt}); return new Response(null,{status:201});};
const hub=new Hub({storage},{});
const call=async(path,body,method='POST')=>{const r=await hub.fetch(new Request('https://x'+path,{method,body:method==='POST'?JSON.stringify(body):undefined}));return r.json();};
const v=await call('/vapid',null,'GET'); ok(v.publicKey&&unb(v.publicKey).length===65,'Tự tạo khoá VAPID');
ok((await call('/test',{sub})).r==='ok' && sent.length===1,'Gửi thử ngay');
const s0=sent[0]; ok(s0.opt.headers['Content-Encoding']==='aes128gcm'&&/^vapid t=.+, k=/.test(s0.opt.headers.Authorization),'Có header mã hoá + VAPID');
// kiểm chữ ký JWT
{const [,t,k]=/t=([^,]+), k=(.+)$/.exec(s0.opt.headers.Authorization); const [h,c,sg]=t.split('.'); const pk=await crypto.subtle.importKey('raw',unb(k),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pk,unb(sg),E.encode(h+'.'+c)) && JSON.parse(Buffer.from(c,'base64url')).aud==='https://web.push.apple.com','Chữ ký VAPID hợp lệ, aud đúng');
 ok(await decrypt(new Uint8Array(s0.opt.body))&&JSON.parse(await decrypt(new Uint8Array(s0.opt.body))).body.includes('hoạt động'),'Nội dung thông báo thử đúng');}
const at=Date.now()+90000; ok((await call('/schedule',{sub,at,title:'Hết giờ nghỉ',body:'Vào set 2',tag:'rest'})).ok && alarmAt===at,'Hẹn hết giờ nghỉ: đặt báo thức đúng lúc');
const at2=Date.now()+60000; await call('/schedule',{sub,at:at2,title:'Hết giờ nghỉ',body:'x',tag:'rest'}); ok([...mem.keys()].filter(k=>k.startsWith('job:')).length===1&&alarmAt===at2,'Hẹn lại: thay lần cũ, không trùng');
await call('/cancel',{sub,tag:'rest'}); ok(alarmAt===null,'Huỷ hẹn');
// chạy báo thức
await call('/schedule',{sub,at:Date.now()+100,title:'Hết giờ nghỉ',body:'Vào set 2',tag:'rest'}); await new Promise(r=>setTimeout(r,200)); sent.length=0; await hub.alarm();
ok(sent.length===1 && JSON.parse(await decrypt(new Uint8Array(sent[0].opt.body))).title==='Hết giờ nghỉ' && alarmAt===null,'Đến giờ: gửi thông báo, xoá việc');
// nhắc lịch tuần (giờ VN, tzOff = -420)
const r=await call('/remind',{sub,tzOff:-420,rules:[{dow:2,hm:'17:30',title:'Còn 30 phút nữa tập Lưng',body:'5 bài'},{dow:6,hm:'08:00',title:'Nhập cân nặng'}]});
ok(r.n===2,'Đăng ký 2 lịch nhắc');
const na=nextAt({dow:2,hm:'17:30'},-420,Date.UTC(2026,9,19,0,0)); ok(new Date(na).toISOString()==='2026-10-20T10:30:00.000Z','Thứ Ba 17:30 giờ VN = 10:30 UTC');
const jobR=[...mem].filter(([k])=>k.includes(':r0'))[0]; mem.set(jobR[0],{...jobR[1],at:Date.now()-10}); sent.length=0; await hub.alarm();
const jr=mem.get(jobR[0]); ok(sent.length===1&&jr&&jr.at>Date.now()+86400e3,'Nhắc xong: tự hẹn tuần sau');
// chủ đề Drive
const sub2={endpoint:'https://fcm.googleapis.com/x2',keys:sub.keys}; await call('/sub',{sub:sub2,topics:['T'.repeat(20)]}); await call('/sub',{sub,topics:['T'.repeat(20)]});
sent.length=0; const nn=await call('/notify',{topic:'T'.repeat(20),title:'HLV vừa cập nhật giáo án',from:sub.endpoint}); ok(nn.n===1&&sent[0].url===sub2.endpoint,'Báo theo chủ đề, không gửi lại máy gửi');
ok((await call('/notify',{topic:'ngan'})).ok===false,'Chủ đề quá ngắn bị chặn');
globalThis.fetch=async()=>new Response(null,{status:410}); await call('/test',{sub:sub2}); ok(![...mem.keys()].some(k=>k.startsWith('sub:'))||[...mem.keys()].filter(k=>k.startsWith('sub:')).length===1,'Máy đã gỡ app (410): tự xoá đăng ký');
