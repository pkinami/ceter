import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocumentType, Prisma } from "@prisma/client";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SITE_URL } from "@/lib/seo";

export const BUSINESS_DOCUMENT_BUCKET=process.env.SUPABASE_BUSINESS_DOCUMENTS_BUCKET||"business-documents";
export type BusinessDocumentInput={type:DocumentType;number:string;title:string;issueDate?:string;dueDate?:string|null;meta?:Array<[string,string|null|undefined]>;customerName?:string|null;customerCompany?:string|null;customerEmail?:string|null;customerPhone?:string|null;customerAddress?:string|null;customerPin?:string|null;paymentMethod?:string|null;paymentDetails?:Array<[string,string|null|undefined]>;lines?:Array<string|{description:string;sku?:string|null;details?:string|null;quantity?:number;unitPrice?:string;discount?:string;vat?:string;taxInfo?:string|null;total?:string}>;totals?:Array<[string,string]>;footer?:string[]};
type A={r:PDFFont;m:PDFFont;b:PDFFont;logo:PDFImage;mark:PDFImage}; type R={d:string;q:string;u:string;t:string;details?:string|null};
// The values below are the measured Word-master values, expressed in PDF points.
// Keep all generated quotation content inside its one-inch Letter margins.
const W=612,H=792,L=72,R=540,C=R-L,RH=21.75,F=43, teal=rgb(20/255,184/255,166/255),dark=rgb(0,0,0),muted=rgb(116/255,116/255,116/255),termsGray=rgb(56/255,59/255,64/255),border=rgb(85/255,85/255,85/255);

/**
 * The first-page artwork is a one-time native Word export of the supplied
 * master. Dynamic envelopes are blanked at preparation time; no runtime Word
 * conversion or remote conversion service is used.
 */
export async function brandedPdfBytes(i:BusinessDocumentInput){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const a=await assets(pdf),rows=norm(i.lines||[]),parts=pages(rows,i,a);
 for(let n=0;n<parts.length;n++){
  const first=n===0,last=n===parts.length-1;
  let p:PDFPage;
  if(first){p=pdf.addPage([W,H]);masthead(p,a);referenceHeader(p,i,a)}else{p=pdf.addPage([W,H]);continuation(p,i,a)}
  const top=first?497:710;const bottom=table(p,i.type,a,parts[n],top);
  if(last)closing(p,i,a,bottom);footer(p,a)
 }
 return Buffer.from(await pdf.save())
}
export async function uploadBusinessDocument(path:string,bytes:Buffer){const{error}=await createServiceRoleClient().storage.from(BUSINESS_DOCUMENT_BUCKET).upload(path,bytes,{contentType:"application/pdf",upsert:true,cacheControl:"3600"});if(error)throw new Error(`Document upload failed: ${error.message}`);return null}
export async function deleteBusinessDocuments(paths:string[]){if(!paths.length)return;const{error}=await createServiceRoleClient().storage.from(BUSINESS_DOCUMENT_BUCKET).remove(paths);if(error)throw new Error(`Document cleanup failed: ${error.message}`)}
export async function signedBusinessDocumentUrl(path:string,bucket=BUSINESS_DOCUMENT_BUCKET,download=true){const{data,error}=await createServiceRoleClient().storage.from(bucket).createSignedUrl(path,Math.max(60,parseInt(process.env.BUSINESS_DOCUMENT_SIGNED_URL_SECONDS||"300",10)),{download});if(error)throw new Error(`Document download link could not be created: ${error.message}`);return data.signedUrl}
export function businessDocumentOnlineUrl(type:DocumentType,number:string){return `${SITE_URL}/documents/${encodeURIComponent(type)}/${encodeURIComponent(number)}`}
export function documentCreateData(input:{document_type:DocumentType;document_number?:string|null;title:string;storage_path:string;public_url?:string|null;customer_id?:string|null;quote_id?:string|null;proforma_invoice_id?:string|null;invoice_id?:string|null;payment_id?:string|null;receipt_id?:string|null;delivery_id?:string|null;expense_id?:string|null;supplier_id?:string|null;purchase_order_id?:string|null;supplier_invoice_id?:string|null;tender_id?:string|null;company_document_id?:string|null;category?:Prisma.DocumentCreateManyInput["category"];expiry_date?:Date|null;reminder_date?:Date|null;notes?:string|null;created_by_id?:string|null}):Prisma.DocumentCreateManyInput{return{...input,document_number:input.document_number??null,bucket:BUSINESS_DOCUMENT_BUCKET,public_url:input.public_url??null}}

async function assets(pdf:PDFDocument):Promise<A>{
 const arimo=(w:string)=>join(process.cwd(),"node_modules/@fontsource/arimo/files",`arimo-latin-${w}-normal.woff`);
 // Arial is used when this host supplies it. It cannot be committed or assumed
 // on Vercel, so the legally redistributable, metric-compatible Arimo fallback
 // is embedded there. Poppins is deliberately not used in document output.
 const regular=existsSync("C:\\Windows\\Fonts\\arial.ttf")?"C:\\Windows\\Fonts\\arial.ttf":arimo("400");
 const bold=existsSync("C:\\Windows\\Fonts\\arialbd.ttf")?"C:\\Windows\\Fonts\\arialbd.ttf":arimo("700");
 const[r,b,logo,mark]=await Promise.all([pdf.embedFont(readFileSync(regular),{subset:true}),pdf.embedFont(readFileSync(bold),{subset:true}),pdf.embedPng(readFileSync(join(process.cwd(),"public/ceter-logo-pack/lockup/ceter-logo-horizontal.png"))),pdf.embedPng(readFileSync(join(process.cwd(),"public/ceter-logo-pack/icon/ceter-icon.png")))]);
 return{r,m:r,b,logo,mark}}
function norm(lines:NonNullable<BusinessDocumentInput["lines"]>):R[]{return lines.map(x=>{if(typeof x==="string"){const m=x.match(/^(\d+)\s+x\s+(.+?)\s+@\s+(.+?)\s+=\s+(.+)$/);return{d:m?.[2]||x,q:m?.[1]||"",u:money(m?.[3]||""),t:money(m?.[4]||"")}}return{d:x.description,q:x.quantity==null?"":String(x.quantity),u:money(x.unitPrice||""),t:money(x.total||""),details:x.details}})}
function recipient(i:BusinessDocumentInput){return[i.customerCompany||i.customerName,i.customerCompany&&i.customerName&&i.customerCompany!==i.customerName?i.customerName:null,i.customerAddress,i.customerEmail,i.customerPhone,i.customerPin?`PIN: ${i.customerPin}`:null].filter(Boolean) as string[]}
function closeH(i:BusinessDocumentInput){return i.type==="delivery_note"?130:["receipt","customer_statement"].includes(i.type)?100:330}
function rowHeight(r:R,a:A){return Math.max(RH,wrap(r.d,195,9,a.r).length*11+8)}
function pages(rows:R[],i:BusinessDocumentInput,a:A){if(!rows.length)return[[]];const out:R[][]=[],left=[...rows];let initial=true;while(left.length){const tableTop=initial?497:710,available=tableTop-F-closeH(i)-RH;let used=0,take=0;for(const row of left){const h=rowHeight(row,a);if(take&&used+h>available)break;used+=h;take++}out.push(left.splice(0,Math.max(1,take)));initial=false}return out}

function masthead(p:PDFPage,a:A){
 draw(p,"Ceter Technologies LTD",L,724,18,a.b,teal);
 [["PIN: P052551065A",true],["GPO, 2356 - 00100",false],["Nairobi, Kenya",false],["+254113807369 | info@cetertechnologies.com",false]].forEach(([v,b],n)=>draw(p,String(v),L,708-n*15,9,b?a.b:a.r,muted));
 const size=a.logo.scale(.17);p.drawImage(a.logo,{x:R-size.width,y:690,width:size.width,height:size.height});
 p.drawLine({start:{x:L,y:652},end:{x:R,y:652},color:border,thickness:.75});
}
function referenceHeader(p:PDFPage,i:BusinessDocumentInput,a:A){
 fit(p,title(i.title),R,586.5,14,a.b,teal,145,"right");
 draw(p,party(i.type),L,543,9,a.b);
 const recipientX=L+(i.type==="receipt"?86:56);
 recipient(i).slice(0,4).forEach((v,n)=>fit(p,v,recipientX,543-n*15,9,n?a.r:a.m,dark,R-recipientX-10));
 const m=meta(i);m.slice(0,4).forEach(([k,v],n)=>label(p,a,referenceLabel(k),v,452,543-n*15,88));
}
function referenceLabel(k:string){return k.replace("Quotation No.","Quote no.").replace("Issue Date","Date").replace("Payment Date","Date")}
function continuation(p:PDFPage,i:BusinessDocumentInput,a:A){draw(p,"Ceter Technologies LTD",L,748,12,a.b,teal);fit(p,`${title(i.title)} — ${i.number}`,R,748,10,a.b,teal,250,"right");p.drawLine({start:{x:L,y:730},end:{x:R,y:730},color:border,thickness:.55})}
function label(p:PDFPage,a:A,k:string,v:string,x:number,y:number,w:number){draw(p,`${k}:`,x,y,9,a.b,dark,"right");let q=9;const z=clean(v);while(q>4&&a.r.widthOfTextAtSize(z,q)>w-8)q-=.25;draw(p,z,x+8,y,q,a.r,dark)}
function cols(type:DocumentType){if(type==="delivery_note")return[["Description",L+5,238],["Ordered",302,75],["Delivered",384,75],["Outstanding",466,87]];if(type==="receipt")return[["Payment detail",L+5,275],["Reference",340,120],["Amount received",462,91]];if(type==="customer_statement")return[["Date",L+5,70],["Document / reference",128,135],["Description",270,112],["Debit",390,75],["Credit",472,80]];return[["Description",L+5,195],["Quantity",L+205,80],["Unit price",L+290,115],["Amount",L+410,55]]}
function table(p:PDFPage,type:DocumentType,a:A,rows:R[],top:number){const cs=cols(type),dividers=cs.slice(1).map(c=>Number(c[1])-5);p.drawRectangle({x:L,y:top-RH,width:C,height:RH,color:teal,borderColor:border,borderWidth:.75});dividers.forEach(x=>p.drawLine({start:{x,y:top-RH},end:{x,y:top},color:border,thickness:.75}));cs.forEach(c=>draw(p,String(c[0]),Number(c[1]),top-15,9,a.b));let bottom=top-RH;rows.forEach((r)=>{const h=rowHeight(r,a);bottom-=h;p.drawRectangle({x:L,y:bottom,width:C,height:h,color:rgb(1,1,1),borderColor:border,borderWidth:.75});dividers.forEach(x=>p.drawLine({start:{x,y:bottom},end:{x,y:bottom+h},color:border,thickness:.75}));if(type==="quotation")quoteRow(p,a,r,bottom,h);else row(p,type,a,r,bottom,h)});return bottom}
function quoteRow(p:PDFPage,a:A,r:R,y:number,h:number){const base=y+h-14;wrapped(p,r.d,L+5,base,195,9,a.r,Math.ceil(h/10));draw(p,r.q,L+205,base,9,a.r);fit(p,r.u,L+290,base,9,a.r,dark,115);fit(p,r.t,L+410,base,9,a.r,dark,55)}
function row(p:PDFPage,type:DocumentType,a:A,r:R,y:number,h:number){const base=y+h-14;if(type==="delivery_note"){const o=r.u.replace(/^KES\s*/,""),d=r.q,out=num(o)>=num(d)?String(Math.max(0,num(o)-num(d))):"";wrapped(p,r.d,L+5,base,235,8.4,a.r,Math.ceil(h/10));draw(p,o,302,base,8.4,a.r);draw(p,d,384,base,8.4,a.r);draw(p,out,466,base,8.4,a.r);return}if(type==="receipt"){const[d,ref]=r.d.split("|").map(x=>x.trim());wrapped(p,d,L+5,base,275,8.4,a.r,Math.ceil(h/10));fit(p,ref||r.details||"—",340,base,8.4,a.r,dark,115);fit(p,r.t||r.u,R,base,8.4,a.r,dark,91,"right");return}if(type==="customer_statement"){const[date,ref,d]=r.d.split("|").map(x=>x.trim()),credit=/^\(/.test(r.t);fit(p,date||"—",L+5,base,7.7,a.r,dark,67);fit(p,ref||"—",128,base,7.7,a.r,dark,130);wrapped(p,d||"—",270,base,105,7.7,a.r,Math.ceil(h/10));fit(p,credit?"":r.t,465,base,7.7,a.r,dark,75,"right");fit(p,credit?r.t.replace(/[()]/g,""):"",R,base,7.7,a.r,dark,80,"right");return}wrapped(p,r.d,L+5,base,195,8.5,a.r,Math.ceil(h/10));draw(p,r.q,L+205,base,8.5,a.r);fit(p,r.u,L+290,base,8.5,a.r,dark,115);fit(p,r.t,R,base,8.5,a.r,dark,58,"right")}

function closing(p:PDFPage,i:BusinessDocumentInput,a:A,bottom:number){if(i.type==="delivery_note")return acknowledgement(p,i,a,bottom-16);const ts=totals(i.totals||[]),start=bottom-15,x=330,w=R-x;
 ts.forEach(([k,v],n)=>{const y=start-n*20;const filled=n===0||n===ts.length-1&&/^balance/i.test(k);p.drawRectangle({x,y:y-20,width:w,height:20,color:filled?teal:rgb(1,1,1),borderColor:border,borderWidth:.75});draw(p,k,x+4,y-14,9,a.b);fit(p,v,R-4,y-14,9,a.b,dark,110,"right")});const after=start-ts.length*20-12;if(["receipt","customer_statement"].includes(i.type)){if(i.footer?.length){section(p,a,i.type==="receipt"?"Payment note":"Statement note",L,after-3);wrapped(p,unique(i.footer).join(" "),L,after-19,C,7.5,a.r,2)}return}const paymentBottom=payment(p,i,a,after);terms(p,i,a,paymentBottom-18)}
function payment(p:PDFPage,i:BusinessDocumentInput,a:A,top:number){
 const x=L,width=C/2,pad=10,leftX=x,rightX=x+width,colWidth=width;
 const headingY=top-8,headingSize=8.3,labelSize=7.1,line=10;
 draw(p,"PAYMENT INSTRUCTIONS",L,headingY,headingSize,a.b,teal);
 const headingRowY=headingY-15;
 draw(p,"Cheque, NEFT/RTGS",leftX+pad,headingRowY,7.1,a.b);
 draw(p,"Mobile Money (M-Pesa/Airtel money)",rightX+pad,headingRowY,7.1,a.b);
 const defaults:[string,string][]=[["Account Name","CETER TECHNOLOGIES LIMITED"],["Bank","Gulf African Bank (Eastleigh Branch)"],["Account Number","0900718801"],["Swift Code","GAFRKENA"],["Branch Code","003"]];
 const mobileDefaults:[string,string][]=[["Paybill","630640"],["Account Number","188188"],["Business Name","CETER TECHNOLOGIES LIMITED"]];
 const provided=i.paymentDetails?.filter(([,v])=>Boolean(v)).map(([k,v])=>[k,String(v)] as [string,string]);
 const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z]/g,"");
 const get=(key:string,fallback:string)=>provided?.find(([name])=>normalize(name)===normalize(key))?.[1]??fallback;
 const left=defaults.map(([k,v])=>[k,get(k,v)] as [string,string]);
 const mobile=mobileDefaults.map(([k,v])=>[k,get(k,v)] as [string,string]);
 const drawColumn=(columnX:number,items:[string,string][])=>{
  const labelW=83,colonW=9,valueX=columnX+pad+labelW+colonW,valueW=colWidth-pad*2-labelW-colonW;
  const rows=items.map(([k,v])=>({k,v,lines:wrap(v,valueW,7.1,a.r)}));
  let cursor=headingRowY-13;
  rows.forEach(({k,v,lines})=>{const rowH=Math.max(line,lines.length*9+2),base=cursor-7.1;draw(p,k,columnX+pad,base,labelSize,a.r);draw(p,":",columnX+pad+labelW,base,labelSize,a.b);lines.forEach((part,index)=>draw(p,part,valueX,base-index*9,7.1,a.r));cursor-=rowH});
  return cursor;
 };
 const leftBottom=drawColumn(leftX,left),rightBottom=drawColumn(rightX,mobile),bottom=Math.min(leftBottom,rightBottom)-4;
 const rule=rgb(0.78,0.80,0.82);
 p.drawLine({start:{x:leftX,y:headingRowY+8},end:{x:rightX+width,y:headingRowY+8},color:rule,thickness:.45});
 p.drawLine({start:{x:rightX,y:headingRowY+8},end:{x:rightX,y:bottom},color:rule,thickness:.55});
 return bottom;
}
function terms(p:PDFPage,i:BusinessDocumentInput,a:A,top:number){section(p,a,"Terms & Conditions",L,top);wrap(unique([term(i.type),...(i.footer||[])]).join(" "),C,7.5,a.r).slice(0,3).forEach((v,n)=>draw(p,v,L,top-17-n*9.5,7.5,a.r,termsGray))}
function acknowledgement(p:PDFPage,i:BusinessDocumentInput,a:A,top:number){section(p,a,"Receiving Acknowledgement",L,top);wrapped(p,unique([term(i.type),...(i.footer||[])]).join(" "),L,top-16,C,7.5,a.r,2);const y=top-57;[["Received by",L,145],["Signature",240,145],["Date",424,130]].forEach(([k,x,w])=>{p.drawLine({start:{x:Number(x),y},end:{x:Number(x)+Number(w),y},color:border,thickness:.6});draw(p,String(k),Number(x),y-13,7.6,a.m,muted)});p.drawLine({start:{x:L,y:y-40},end:{x:R,y:y-40},color:border,thickness:.6});draw(p,"Remarks",L,y-55,7.6,a.m,muted)}
function footer(p:PDFPage,a:A){draw(p,`Generated: ${new Date().toLocaleString("en-KE",{hour12:false,timeZone:"Africa/Nairobi"})} EAT`,L,28,8,a.r);const mark=a.mark.scale(.045);p.drawImage(a.mark,{x:W/2-mark.width/2,y:24,width:mark.width,height:mark.height});draw(p,"Powered by Ceter Technologies Ltd.",R-50,28,7,a.r,dark,"right")}
function meta(i:BusinessDocumentInput):Array<[string,string]>{const x=new Map((i.meta||[]).filter(([,v])=>Boolean(v)).map(([k,v])=>[k.toLowerCase(),String(v)])),issue=i.issueDate||x.get("issue date")||new Date().toLocaleDateString("en-KE"),lpo=x.get("lpo no."),time=new Date().toLocaleTimeString("en-KE",{hour12:false,timeZone:"Africa/Nairobi"});if(i.type==="quotation")return[["Quotation No.",i.number],["Issue Date",issue],["Time",time],...(lpo?[["LPO No.",lpo] as [string,string]]:[])];if(i.type==="invoice")return[["Invoice No.",i.number],["LPO No.",lpo||"—"],["Issue Date",issue],["Due Date",i.dueDate||x.get("due date")||"—"]];if(i.type==="proforma_invoice")return[["Proforma No.",i.number],["Issue Date",issue],["Valid Until",i.dueDate||x.get("validity")||"—"],...(lpo?[["LPO No.",lpo] as [string,string]]:[])];if(i.type==="receipt")return[["Receipt No.",i.number],["Payment Date",issue],["Method",x.get("method")||"—"],["Reference",x.get("reference")||"—"]];if(i.type==="delivery_note")return[["Delivery Note No.",i.number],["Order Ref",x.get("order")||x.get("reference")||"—"],["Delivery Date",i.dueDate||x.get("scheduled")||"—"],...(lpo?[["LPO No.",lpo] as [string,string]]:[])];if(i.type==="purchase_order")return[["PO No.",i.number],["Order Date",issue],["Expected Date",i.dueDate||"—"],["Status",x.get("status")||"—"]];if(i.type==="customer_statement")return[["Statement No.",i.number],["Issue Date",issue],["Period",x.get("period")||"—"],["Status",x.get("status")||"—"]];return[["Document No.",i.number],["Issue Date",issue]]}
function party(t:DocumentType){return t==="receipt"?"Received From":t==="delivery_note"?"Deliver To":t==="purchase_order"||t==="supplier_invoice"?"Supplier":"Bill To"}function totals(t:Array<[string,string]>){const x=t.map(([k,v])=>[k,money(v)] as [string,string]),n=x.findIndex(([k])=>/^total$/i.test(k));if(n>=0&&n!==x.length-1)x.push(...x.splice(n,1));return x}function term(t:DocumentType){if(t==="quotation")return"Invoices are payable within 30 days of the invoice date. Late payments incur interest at 2.5% per month. This quotation is valid until the date stated above; prices are subject to change without notice.";if(t==="invoice")return"Payment is due within 30 days of the invoice date. Late payments incur interest at 2.5% per month. Goods remain property of Ceter Technologies Limited until paid in full.";if(t==="proforma_invoice")return"This proforma invoice is issued for payment planning and does not confirm payment received.";if(t==="delivery_note")return"Items listed are issued for delivery or pickup confirmation by the receiving party.";return""}function section(p:PDFPage,a:A,v:string,x:number,y:number){draw(p,v.toUpperCase(),x,y,8.8,a.b,teal)}
function draw(p:PDFPage,v:string,x:number,y:number,s:number,f:PDFFont,c=dark,align:"left"|"right"|"center"="left"){const z=clean(v),w=f.widthOfTextAtSize(z,s);p.drawText(z,{x:align==="right"?x-w:align==="center"?x-w/2:x,y,size:s,font:f,color:c})}function fit(p:PDFPage,v:string,x:number,y:number,s:number,f:PDFFont,c:ReturnType<typeof rgb>,w:number,align:"left"|"right"="left"){let z=clean(v),q=s;while(q>6.5&&f.widthOfTextAtSize(z,q)>w)q-=.25;if(f.widthOfTextAtSize(z,q)>w)z=`${z.slice(0,Math.max(1,Math.floor(z.length*.85)))}…`;draw(p,z,x,y,q,f,c,align)}function wrapped(p:PDFPage,v:string,x:number,y:number,w:number,s:number,f:PDFFont,max:number){wrap(v,w,s,f).slice(0,max).forEach((z,n)=>draw(p,z,x,y-n*(s+2),s,f))}function wrap(v:string,w:number,s:number,f:PDFFont){const o:string[]=[];let line="";for(const word of clean(v).split(/\s+/)){const next=line?`${line} ${word}`:word;if(line&&f.widthOfTextAtSize(next,s)>w){o.push(line);line=word}else line=next}if(line)o.push(line);return o}function money(v:string){if(!v)return"";const n=num(v);return/^\(?KES\s/i.test(v.trim())?v.trim():Number.isFinite(n)?`KES ${new Intl.NumberFormat("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}`:v.replace(/\bKSh\b/g,"KES")}function num(v:string){const n=Number(v.replace(/[^\d.-]/g,""));return Number.isFinite(n)?n:NaN}function unique(v:Array<string|null|undefined>){return[...new Map(v.filter((x):x is string=>Boolean(x?.trim())).map(x=>[x.trim().toLowerCase(),x.trim()])).values()]}function title(v:string){return v.replace(/Quatation/g,"Quotation").replace(/Pro-forma/g,"Proforma")}function clean(v:string){return String(v??"").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"")}
