

/**@see https://shouldjs.github.io/ */
import {mocks} from "mock-browser"
import * as  should from "should"

describe('proj4.js', ()=>{
    const {proj,
        proj67to84,
        proj97to84,
        proj97to67,
        proj67to97,
        proj84to67,
        proj84to97
    } = require('../dist/lib/proj4.js')
    it("測試座標轉換", async ()=>{
        // todo
        const [x,y] = proj84to67([121,24])
        should.equal(x,-49123623.24126678)
        
        
    }) 
})

// describe('wicket.js [ for arcgis js api 4.14 ]',()=>{
//     const { wicket } = require('../dist/utils.js')
//     const WKT = `MULTIPOLYGON (((40 40, 20 45, 45 30, 40 40)), ((20 35, 10 30, 10 10, 30 5, 45 20, 20 35), (30 20, 20 15, 20 25, 30 20)))`
//     it("wkt2ArcgisObj", async ()=>{
//         // todo
//     })
    
// })