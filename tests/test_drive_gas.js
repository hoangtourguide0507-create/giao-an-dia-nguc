const fs=require('fs'), crypto=require('crypto'), vm=require('vm');
let idc=0; const all={};
function Iter(a){let i=0;return{hasNext:()=>i<a.length,next:()=>a[i++]};}
function File(name,data,mime){this.id='f'+(++idc);this.name=name;this.data=data;this.mime=mime;all[this.id]=this;}
File.prototype={getName(){return this.name},setContent(s){this.data=Buffer.from(s)},getBlob(){const t=this;return{getDataAsString:()=>t.data.toString('utf8'),getBytes:()=>[...t.data],getContentType:()=>t.mime}},makeCopy(n,dest){return dest._add(new File(n,Buffer.from(this.data),this.mime))},setTrashed(){}};
function Folder(name){this.id='d'+(++idc);this.name=name;this.files=[];this.folders=[];all[this.id]=this;}
Folder.prototype={getId(){return this.id},getName(){return this.name},getUrl(){return 'https://drive/'+this.id},
 getFoldersByName(n){return Iter(this.folders.filter(f=>f.name===n&&!f.tr))},getFilesByName(n){return Iter(this.files.filter(f=>f.name===n))},getFolders(){return Iter(this.folders.filter(f=>!f.tr))},getFiles(){return Iter(this.files)},
 createFolder(n){const f=new Folder(n);this.folders.push(f);return f},createFile(a,b,c){const f=typeof a==='string'?new File(a,Buffer.from(b),c):new File(a.name,a.bytes,a.mime);this.files.push(f);return f},_add(f){this.files.push(f);return f},setTrashed(){this.tr=true}};
const my=new Folder('root'); const props={};
const ctx={console,Logger:{log:(...a)=>console.log('LOG',...a)},
 DriveApp:{getFolderById:id=>{if(!all[id])throw new Error('x');return all[id]},getFoldersByName:n=>my.getFoldersByName(n),createFolder:n=>my.createFolder(n)},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>({timeBased:()=>({everyDays:()=>({atHour:()=>({create(){}})})})})},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s).digest()].map(b=>b>127?b-256:b),
  base64Decode:s=>Buffer.from(s,'base64'),base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name}),formatDate:()=>'2026-10-22'},
 ContentService:{MimeType:{JSON:1},createTextOutput:s=>({setMimeType:()=>({s})})}};
vm.createContext(ctx); vm.runInContext(fs.readFileSync('../drive/Code.gs','utf8'),ctx);
const post=o=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(o)}}).s);
// user uploaded empty folder first
my.createFolder('GiaoAnDiaNguc');
ctx.caiDat(); const H=props.MA_HLV; const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
ok(my.folders.length===1,'Dùng lại thư mục đã tải lên, không tạo trùng');
ok(JSON.parse(ctx.doGet().s).daCaiDat,'doGet báo đã cài đặt');
ok(post({a:'ping',ma:H}).vai==='hlv','ping HLV');
const t=post({a:'tv.them',ma:H,ten:'Lan'}); ok(t.ok&&t.ma.length===24,'Thêm học viên');
ok(post({a:'tv.them',ma:'sai',ten:'X'}).ok===false,'Sai mã HLV bị chặn');
ok(post({a:'ping',ma:t.ma,id:t.id}).vai==='hv','ping học viên');
let r=post({a:'day',ma:t.ma,id:t.id,vai:'hv',rev:0,goi:{s:[1]}}); ok(r.ok&&r.rev===1,'HV gửi lên rev 1');
ok(post({a:'day',ma:t.ma,id:t.id,vai:'hv',rev:0,goi:{s:[2]}}).xungDot,'Gửi với rev cũ → xung đột');
ok(post({a:'day',ma:t.ma,id:t.id,vai:'hlv',rev:0,goi:{}}).ok===false,'HV không ghi được phía HLV');
ok(post({a:'day',ma:H,id:t.id,vai:'hlv',rev:0,goi:{p:1}}).rev===1,'HLV gửi giáo án xuống');
const k=post({a:'keo',ma:t.ma,id:t.id}); ok(k.hv.goi.s[0]===1&&k.hlv.goi.p===1,'HV kéo về cả 2 phía');
const t2=post({a:'tv.them',ma:H,ten:'Minh'}); ok(post({a:'keo',ma:t.ma,id:t2.id}).ok===false,'HV không xem được dữ liệu người khác');
const png='data:image/png;base64,'+Buffer.from('abc').toString('base64');
ok(post({a:'anh.co',ma:t.ma,id:t.id,ds:['abcd1234']}).thieu.length===1,'Ảnh chưa có');
ok(post({a:'anh.day',ma:t.ma,id:t.id,anh:{abcd1234:png}}).n===1,'Gửi ảnh');
ok(post({a:'anh.lay',ma:H,ds:['abcd1234']}).anh.abcd1234===png,'Tải ảnh về đúng');
const nm=post({a:'tv.doima',ma:H,id:t.id}); ok(post({a:'keo',ma:t.ma,id:t.id}).ok===false&&post({a:'keo',ma:nm.ma,id:t.id}).ok,'Đổi mã: mã cũ hết hiệu lực');
post({a:'tv.tat',ma:H,id:t.id}); ok(post({a:'keo',ma:nm.ma,id:t.id}).ok===false,'Tắt học viên: bị chặn');
const ds=post({a:'tv.ds',ma:H}); ok(ds.ds.length===2&&ds.ds[0].hv.rev===1,'Danh sách học viên kèm trạng thái');
const kb=post({a:'keo',ma:H,id:t2.id,biet:{hv:0,hlv:0}}); ok(true,'keo biet'); const kk=post({a:'keo',ma:H,id:t.id,biet:{hv:1,hlv:0}}); ok(kk.hv && !('goi' in kk.hv) && kk.hlv.goi,'biết rev: không trả lại dữ liệu cũ');

// ===== PA-21: tài khoản =====
const er=o=>post(o).loi||'';
ok(post({a:'ping',ma:'x'}).coTK===false,'Chưa có tài khoản HLV');
ok(post({a:'hlv.tao',ma:'sai'.repeat(8),u:'hoang',mk:'123456'}).ok===false,'Tạo TK HLV cần MÃ HLV');
ok(/6 ký tự/.test(er({a:'hlv.tao',ma:H,u:'hoang',mk:'123'})),'Mật khẩu quá ngắn bị chặn');
ok(/Tên đăng nhập/.test(er({a:'hlv.tao',ma:H,u:'Hoàng',mk:'123456'})),'Tên đăng nhập có dấu bị chặn');
const th=post({a:'hlv.tao',ma:H,u:'Hoang',mk:'matkhau1',ten:'Hoàng'}); ok(th.ok&&th.vai==='hlv'&&th.u==='hoang'&&th.ma.length===40,'Tạo TK HLV, nhận phiên');
ok(post({a:'ping',ma:'x'}).coTK===true,'ping báo đã có TK HLV');
ok(!JSON.stringify(props).includes('matkhau1'),'Không lưu mật khẩu dạng chữ');
ok(post({a:'tv.ds',ma:th.ma}).ok,'Phiên HLV dùng như MÃ HLV');
const d1=post({a:'dn',u:'hoang',mk:'matkhau1'}); ok(d1.ok&&d1.vai==='hlv'&&d1.ma!==th.ma,'HLV đăng nhập máy thứ 2');
ok(post({a:'tv.ds',ma:th.ma}).ok&&post({a:'tv.ds',ma:d1.ma}).ok,'Hai máy HLV cùng dùng được');
const n3=post({a:'tv.them',ma:d1.ma,ten:'Vợ',u:'vothu',mk:'vo12345'}); ok(n3.ok&&n3.u==='vothu','Thêm học viên kèm tài khoản');
ok(/đã có người dùng/.test(er({a:'tv.them',ma:H,ten:'X',u:'vothu',mk:'123456'})),'Trùng tên đăng nhập bị chặn');
ok(/đã có người dùng/.test(er({a:'tv.tk',ma:H,id:t2.id,u:'hoang',mk:'123456'})),'Không được trùng tên với HLV');
ok(post({a:'tv.tk',ma:H,id:t2.id,u:'minh',mk:'minh123'}).ok,'HLV đặt tài khoản cho học viên cũ');
const dm=post({a:'dn',u:'minh',mk:'minh123'}); ok(dm.ok&&dm.vai==='hv'&&dm.id===t2.id&&dm.hlv==='Hoàng','Học viên đăng nhập → đúng hồ sơ, biết tên HLV');
ok(post({a:'keo',ma:dm.ma,id:t2.id}).ok,'Phiên học viên đọc được dữ liệu của mình');
ok(post({a:'keo',ma:dm.ma,id:n3.id}).ok===false,'Phiên học viên không đọc được người khác');
ok(post({a:'tv.ds',ma:dm.ma}).ok===false,'Học viên không xem được danh sách');
ok(post({a:'day',ma:dm.ma,id:t2.id,vai:'hlv',rev:0,goi:{}}).ok===false,'Học viên không ghi được phía HLV');
ok(/Sai tên/.test(er({a:'dn',u:'minh',mk:'sai999'})),'Sai mật khẩu');
ok(/Sai tên/.test(er({a:'dn',u:'khongco',mk:'123456'})),'Sai tên đăng nhập (cùng thông báo)');
const mk2=post({a:'mk.doi',ma:dm.ma,id:t2.id,mkCu:'minh123',mkMoi:'moi4567'}); ok(mk2.ok&&mk2.ma,'Học viên tự đổi mật khẩu');
ok(/không đúng/.test(er({a:'mk.doi',ma:mk2.ma,id:t2.id,mkCu:'sai',mkMoi:'abcdef'})),'Đổi mật khẩu cần mật khẩu cũ đúng');
ok(post({a:'dn',u:'minh',mk:'minh123'}).ok===false&&post({a:'dn',u:'minh',mk:'moi4567'}).ok,'Mật khẩu mới có hiệu lực');
ok(post({a:'keo',ma:dm.ma,id:t2.id}).ok===false&&post({a:'keo',ma:mk2.ma,id:t2.id}).ok,'Đổi mật khẩu: máy cũ phải đăng nhập lại');
post({a:'tv.tk',ma:H,id:t2.id,u:'minh',mk:'datlai1'}); ok(post({a:'keo',ma:mk2.ma,id:t2.id}).ok===false&&post({a:'dn',u:'minh',mk:'datlai1'}).ok,'HLV đặt lại mật khẩu: phiên cũ hết hạn, mật khẩu mới dùng được');
const dl=post({a:'dn',u:'minh',mk:'datlai1'}); post({a:'dx',ma:dl.ma,id:t2.id}); ok(post({a:'keo',ma:dl.ma,id:t2.id}).ok===false,'Đăng xuất: phiên bị xoá');
post({a:'tv.tat',ma:H,id:t2.id}); ok(/khoá/.test(er({a:'dn',u:'minh',mk:'datlai1'})),'Học viên bị khoá không đăng nhập được'); post({a:'tv.bat',ma:H,id:t2.id});
for(let i=0;i<8;i++) post({a:'dn',u:'vothu',mk:'sai'+i+'xx'}); ok(/thử lại sau/.test(er({a:'dn',u:'vothu',mk:'vo12345'})),'Sai 8 lần: tạm khoá kể cả khi nhập đúng');
ok(post({a:'dn',u:'minh',mk:'datlai1'}).ok,'Khoá chỉ áp dụng cho tên bị dò');
const mh=post({a:'mk.doi',ma:d1.ma,mkCu:'matkhau1',mkMoi:'hlvmoi99'}); ok(mh.ok&&post({a:'tv.ds',ma:th.ma}).ok===false&&post({a:'tv.ds',ma:mh.ma}).ok,'HLV đổi mật khẩu: máy HLV khác phải đăng nhập lại');
ok(post({a:'tv.ds',ma:H}).ok,'MÃ HLV gốc vẫn dùng được');
ok(post({a:'tv.ds',ma:H}).ds.find(x=>x.id===t2.id).u==='minh'&&!JSON.stringify(post({a:'tv.ds',ma:H})).includes('"p"'),'Danh sách có tên đăng nhập, không lộ mật khẩu băm');
ctx.saoLuuHangNgay(); ok(true,'Sao lưu chạy không lỗi');
