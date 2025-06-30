const auditLogMiddleware = (req, res, next) => {
    // JWT should run before this.
    if(req.auth && req.auth.payload){
        const userId = req.auth.payload.sub; // User ID from Auth0 token
        const clientIp = req.ip; // Client IP address
        const method = req.method; // HTTP method (GET, POST, PUT, DELETE)
        const path = req.originalUrl; // Original URL path

        // For POST/PUT/PATCH, you might want to log the body (be careful with sensitive data)
        const body = method === 'POST' || method === 'PUT' || method === 'PATCH' ? JSON.stringify(req.body) : '';

        // TODO: Here I need to separate into 2 services, my self hosted logs for compliance and then a third party for
        //          operational logs, since I need to set app benchmarks and other things.
        // Log the action (you might send this to a dedicated logging service or file in production)
        console.log(`[AUDIT] User: ${userId} | IP: ${clientIp} | Action: ${method} ${path} | Body: ${body}`);

        // You could also store this in a database for more persistent audit trails
        // For example:
        /*
        prisma.auditLog.create({
            data: {
                userId: userId,
                action: `${method} ${path}`,
                ipAddress: clientIp,
                requestBody: body
            }
        }).catch(err => console.error('Failed to save audit log to DB:', err));
        */
    }
    next(); // this is to pass controll onto the next middleware/route handler.
}

module.exports = auditLogMiddleware;