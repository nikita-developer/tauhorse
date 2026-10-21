import staff from '../../../../services/staff.service.js'; import {requireAdmin,sendJsonError} from '../../../../utils/http.js'
export default defineEventHandler(async e=>{try{await requireAdmin(e);const q=getQuery(e);return await staff.listUsers({search:q.search||'',page:Number(q.page||1),limit:Number(q.limit||50),stats_from:q.stats_from,stats_to:q.stats_to})}catch(x){sendJsonError(x)}})
