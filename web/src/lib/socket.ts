import { io, type Socket } from 'socket.io-client'
import { api } from './api'

const path = `${api.basePath()}/socket.io`

export const socket: Socket = io({ path })
