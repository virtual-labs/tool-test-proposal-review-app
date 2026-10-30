import PDFDocument from 'pdfkit';
export async function reviewPdf({fileName,review:r}) {
  const doc=new PDFDocument({size:'A4',margin:51,info:{Title:`Proposal Review: ${r.id}`}});
  const chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const left=51,width=doc.page.width-102,bottom=doc.page.height-51;
  const ink='#243e48',border='#d5e2e3';
  doc.fillColor(ink).font('Helvetica').fontSize(11);
  function space(height){if(doc.y+height>bottom)doc.addPage();}
  function heading(text,size=13){space(36);doc.font('Helvetica-Bold').fontSize(size).text(text,left,doc.y,{width});doc.font('Helvetica').fontSize(11);doc.moveDown(0.7);}
  function metadata(label,value,link=false){
    const text=String(value??'Not recorded')||'Not recorded';
    doc.fontSize(11);space(doc.heightOfString(`${label}: ${text}`,{width})+10);
    doc.font('Helvetica-Bold').fillColor(ink).text(`${label}: `,left,doc.y,{width,continued:true});
    doc.font('Helvetica').fillColor(link?'#286575':ink).text(text,{width,link:link?text:undefined,underline:link});
    doc.fillColor(ink).moveDown(0.55);
  }
  doc.fontSize(10).fillColor('#52717d').text('Virtual Labs - Proposal Review Portal',left,doc.y,{width});
  doc.fillColor(ink).moveDown(0.8);heading('Proposal Review Form',20);doc.moveDown(0.5);heading(r.name,13);
  for(const [label,value] of [['Proposal ID',r.id],['Domain',r.domain],['No. of Experiments',r.numberOfExperiments],['Reviewed Date',r.submittedAt],['Review ID',r.reviewId],['Reviewer',r.reviewer||(r.assignedReviewers||[]).join(', ')],['Rank',r.rank??'Not ranked'],['Rank Justification',r.justification||'None']])metadata(label,value);
  metadata('Proposal Link',r.link,!!r.link);
  doc.moveDown(0.7);space(85);heading('Submitted Ratings');
  const widths=[width*0.1,width*0.65,width*0.25];
  function row(values,bold=false){
    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(11);
    const height=Math.max(30,...values.map((value,i)=>doc.heightOfString(String(value),{width:widths[i]-16})+16));
    if(doc.y+height>bottom){doc.addPage();row(['S.No.','Evaluation Parameter','Rating'],true);doc.font(bold?'Helvetica-Bold':'Helvetica');}
    const y=doc.y;let x=left;
    values.forEach((value,i)=>{doc.lineWidth(0.5).strokeColor(border).rect(x,y,widths[i],height).stroke();doc.fillColor(ink).text(String(value),x+8,y+9,{width:widths[i]-16,align:'center'});x+=widths[i];});
    doc.x=left;doc.y=y+height;
  }
  row(['S.No.','Evaluation Parameter','Rating'],true);
  r.ratings.forEach((rating,index)=>row([index+1,rating.label,rating.value==null?'Not recorded':`${rating.value}/${r.ratingMaximum}`]));
  doc.font('Helvetica').moveDown(1.4);
  function section(title,text){heading(title);doc.text(text||'None',left,doc.y,{width,lineGap:3});doc.moveDown(1);}
  if(r.formVersion!=='2')section('Overall Feedback',r.overallFeedback);
  section('Reviewer Comments / Suggestions',r.formVersion==='2'?r.reviewerComments:r.additionalComments);
  space(35);const y=doc.y;doc.strokeColor(border).moveTo(left,y).lineTo(left+width,y).stroke();
  doc.fontSize(9).text(`Final submission - read only. Ratings use the original ${r.ratingMaximum}-point scale.`,left,y+12,{width});
  doc.end();
  const bytes=await done;
  if(bytes.length>3*1024*1024)throw new Error('PDF exceeds download limit');
  return {fileName,mimeType:'application/pdf',base64:bytes.toString('base64')};
}
