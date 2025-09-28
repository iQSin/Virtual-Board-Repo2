const jwt = require('jsonwebtoken')
require('dotenv').config()

module.exports = (req, res, next) => {
    console.log('Authorize JWT')
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader.split(' ')[1]

        console.log(token)

        const user = jwt.verify(token, process.env.JWT_SECRET)
        
        req.authUser = user

        console.log(`token valid for user ${user.sub} ${user.name}`)

        next()
    } catch (error) {
        console.log(error)
        res.status(401).json({
            msg: "Authorization failed.",
            error: error.message
        })
    }

}