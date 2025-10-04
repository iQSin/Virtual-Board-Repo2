const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authorize)

router.get('/', async (req, res) => {
    try {
        const notes = await prisma.note.findMany({
            where: { userId: req.authUser.userId } 
        })
        res.json(notes)
    } catch (error) {
        console.log(error)
        res.status(500).send({msg: "Error"})
    }
})

router.post('/', async (req, res) => {

    try {
        const newNote = await prisma.note.create({
            data: {
                text: req.body.text,
                userId: req.authUser.userId
            }
          })

        res.json({msg: "New note created", id: newNote.id})

    } catch (error) {
        console.log(error)
        res.status(500).send({msg: "Error: POST failed"})
    }
})

router.put('/:id', (req, res) => {
    tempData[req.params.id] = req.body
        
    res.send({ 
        method: req.method, 
        body: req.body
    })

})

router.delete('/:id', async (req, res) => {
    try {
      await prisma.note.delete({
        where: { id: Number(req.params.id) }
      })
      res.json({ msg: `Note ${req.params.id} deleted` })
    } catch (error) {
      console.error(error)
      res.status(500).json({ msg: "Error deleting note" })
    }
  })

module.exports = router