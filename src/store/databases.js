import { redis } from '@/services/redis'
import Vue from 'vue'

export default {
  namespaced: true,
  state: {
    list: [],
    total: 0,
    selected: 0,
    infoAllowed: true,
  },
  mutations: {
    resetList(state) {
      Vue.set(state, 'list', [])
    },
    setDatabase (state, database) {
      Vue.set(state.list, database.index, database)
    },
    setTotal (state, total) {
      state.total = total
    },
    select (state, index) {
      state.selected = index
    },
    setInfoAllowed (state, isAllowed) {
      state.infoAllowed = isAllowed
    },
  },
  actions: {
    load ({ commit }) {
      return Promise.all([
        redis.async('config', 'GET', 'databases').then(list => commit('setTotal', parseInt(list[1]))),
        redis.async('info', 'keyspace').then(databases => {
          commit('resetList')
          databases.split('\n').slice(1, -1).forEach(db => {
            let id, meta, key, value;

            [id, meta] = db.split(':')
            let database = { id, index: parseInt(id.replace('db', '')) }

            meta.split(',').forEach(param => {
              [key, value] = param.split('=')
              database[key] = value
            })

            commit('setDatabase', database)
          })
        }).catch(e => {
          if (String(e).includes('NOPERM')) {
            commit('setInfoAllowed', false)
            commit('setDatabase', {
              avg_ttl: '?',
              expires: '?',
              id: 'db0',
              index: 0,
              keys: '?',
            })
          } else {
            throw e
          }
        }),
      ])
    },
    select ({ commit, dispatch }, index) {
      index = parseInt(index)
      return redis.async('select', index).then(() => {
        commit('select', index)
        commit('keys/unloadKey', undefined, { root: true })
        dispatch('keys/loadKeys', undefined, { root: true })
      })
    },
  },
}
