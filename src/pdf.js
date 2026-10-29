import PDFDocument from 'pdfkit';
export async function reviewPdf({fileName,review:r}) {
  const doc=new PDFDocument({size:'A4',margin:45,info:{Title:`Proposal Review: ${r.id}`}});
  const chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  doc.fontSize(10).text('Virtual Labs — Proposal Review Portal');doc.moveDown();doc.fontSize(20).text('Proposal Review Form');doc.moveDown();doc.fontSize(14).text(r.name);
  doc.moveDown();doc.fontSize(10);
  for(const [label,value] of [['Proposal ID',r.id],['Domain',r.domain],['No. of Experiments',r.numberOfExperiments],['Reviewed Date',r.submittedAt],['Review ID',r.reviewId],['Reviewers',(r.assignedReviewers||[]).join(', ')],['Rank',r.rank??'Not ranked'],['Rank justification',r.justification||'None'],['Proposal link',r.link]]) doc.text(`${label}: ${value||'Not recorded'}`).moveDown(0.3);
  doc.moveDown().fontSize(13).text('Submitted Ratings').moveDown(0.5).fontSize(10);
  for(const rating of r.ratings)doc.text(`${rating.label}: ${rating.value==null?'Not recorded':`${rating.value}/${r.ratingMaximum}`}`).moveDown(0.4);
  if(r.formVersion!=='2')doc.moveDown().fontSize(13).text('Overall Feedback').fontSize(10).text(r.overallFeedback||'None');
  doc.moveDown().fontSize(13).text('Reviewer Comments / Suggestions').fontSize(10).text((r.formVersion==='2'?r.reviewerComments:r.additionalComments)||'None');
  doc.moveDown().fontSize(9).text(`Final submission — read only. Original ${r.ratingMaximum}-point rating scale.`);
  doc.end();
  const bytes=await done;
  if(bytes.length>3*1024*1024)throw new Error('PDF exceeds download limit');
  return {fileName,mimeType:'application/pdf',base64:bytes.toString('base64')};
}
