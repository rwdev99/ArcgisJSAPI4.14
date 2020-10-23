

/**@see https://shouldjs.github.io/ */
require('should')
const {loadModule} = require('../dist/utils.js')

describe('utils.js', ()=>{
    it("模組載入器", async ()=>{
        const o = (await loadModule('esri/Map'))
        console.log(o)
        // o.should.equal(0)
    }) 
})