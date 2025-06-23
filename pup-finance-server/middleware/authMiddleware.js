const {auth} = require("express-oauth2-jwt-bearer");
const jwtCheck = auth({
    audience: AUTH0_AUDIENCE,
    issuerBaseURL: "https://dev-hzy6udg2p7nicovr.us.auth0.com",
    tokenSigningAlg: 'RS256'
})