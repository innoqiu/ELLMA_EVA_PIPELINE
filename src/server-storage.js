export let serverConfig=null;
export let initialServerState;
let revision=0,pending=null,saving=false,stopped=false;
export async function bootstrapServer(){
 if(import.meta.env.DEV)return;
 const response=await fetch('/api/bootstrap');if(!response.ok)throw Error('Cannot load saved server data. Please reload; no data has been overwritten.');
 const result=await response.json();serverConfig=result.config;initialServerState=result.state;revision=result.revision;
}
export function modelHeaders(config){return {'Content-Type':'application/json',...(config.serverManaged?{'X-ELLMA-Client':'1'}:{Authorization:`Bearer ${config.apiKey}`})};}
export function persistServerState(state){pending=state;if(saving||stopped)return;void drain();}
async function drain(){saving=true;try{while(pending){const next=pending;pending=null;const response=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-ELLMA-Client':'1'},body:JSON.stringify({state:{...next,config:undefined},revision})});if(!response.ok)throw Error(response.status===409?'Another browser updated this workspace. Reload before making more changes.':'Server save failed. Keep this page open and check the server.');revision=(await response.json()).revision;}}catch(e){stopped=true;window.dispatchEvent(new CustomEvent('ellma-save-error',{detail:e.message}));}finally{saving=false;}}
