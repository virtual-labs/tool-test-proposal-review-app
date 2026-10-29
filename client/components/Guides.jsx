import React from 'react';
import {Dialog} from './Dialog.jsx';
import {roleGuides} from '../guide-content.js';

export function Help({onClose}){
  return <Dialog title="Sign-in help" id="loginHelpGuide" onClose={onClose} closeLabel="Close Help"><ol>
    <li><strong>Unable to sign in:</strong> Use the email address registered by your administrator. Your account must be active. Contact support if you are unsure which address to use.</li>
    <li><strong>Verification email not received:</strong> Check your spam or junk folder and confirm the email address. Wait sixty seconds before requesting another code. Contact support if it still does not arrive.</li>
    <li><strong>Invalid or expired code:</strong> Use the latest six-digit code in the tab where you requested it. Codes expire after ten minutes and work only once. Request a new code if needed.</li>
    <li><strong>Portal invalid response:</strong> If the portal returns an invalid response, save your work if possible and use Refresh. Read any unsaved-changes warning before continuing. On the sign-in screen, wait a moment and try again.</li>
    <li><strong>Session expired:</strong> Sign in again. Unsaved changes can be restored in the same tab when you sign in with the same account. Reloading or closing the tab loses unsaved changes.</li>
    <li><strong>Browser refresh:</strong> Reloading or closing the tab can lose unsaved work. Saved drafts and submitted reviews remain stored. You may need to sign in again if your session has expired.</li>
    <li><strong>Contact support:</strong> Email <a href="mailto:support@vlabs.ac.in">support@vlabs.ac.in</a> or <a href="mailto:manager.iitdelhi@gmail.com">manager.iitdelhi@gmail.com</a> with the error message and action you were performing. Do not share verification codes or session tokens.</li>
  </ol></Dialog>;
}
export function UserGuide({user,onClose}){
  return <Dialog title={`${user.role==='Admin'?'Administrator':user.role} User Guide`} id="userGuideDialog" onClose={onClose} closeLabel="Close Guide"><ol>{(roleGuides[user.role]||[]).map((text,i)=><li key={i}>{text}</li>)}</ol></Dialog>;
}
const ButtonName=({children})=><span className="guideline-button-name">{children}</span>;
export function RankingGuidelines({onClose}){
  return <Dialog title="Ranking Guidelines" id="rankingGuidelinesDialog" onClose={onClose}><ol className="ranking-instructions">
    <li><strong>Eligible proposals:</strong> You can rank proposals in your domain whose final reviews you submitted. Each LDC has a separate ranking list.</li>
    <li><strong>Check the proposal and review:</strong> Use <ButtonName>View Proposal</ButtonName> and <ButtonName>View Review</ButtonName> to check the supporting information before ranking.</li>
    <li><strong>Overall Score:</strong> The overall score is the sum of the scores for the first seven review questions, out of a maximum of 42.</li>
    <li><strong>Generate Rankings:</strong> Newly submitted reviews remain unranked. Click <ButtonName>Generate Rankings</ButtonName> to rank your proposals from highest to lowest overall score, with <em>Rank 1</em> as the highest priority. Proposals with equal scores are ordered by <em>Proposal ID</em> in ascending order. After confirmation, this action immediately saves the generated ranks, replacing existing ranks while preserving justifications.</li>
    <li><strong>Manual ranking:</strong> You can assign ranks manually or modify the generated ranks. Select - (Unranked) to remove a rank, including all ranks. Unranked proposals appear first, ordered by Proposal ID. Use each rank only once in your list. Click <ButtonName>Save Rankings</ButtonName> to save your changes. Saved ranks remain unchanged until you edit and save them or click <ButtonName>Generate Rankings</ButtonName> again.</li>
    <li><strong>Justification:</strong> Click <ButtonName>Add</ButtonName> or <ButtonName>View/Edit</ButtonName> to enter or modify the justification for a proposal’s rank. To remove it, clear the text and submit. Then click <ButtonName>Save Rankings</ButtonName> to save the justification changes.</li>
    <li><strong>Before leaving:</strong> Save your rank and justification changes before refreshing or leaving the page. You can return later to update them. Open <ButtonName>Domain Dashboard</ButtonName> to view saved rankings in your domain.</li>
  </ol></Dialog>;
}
