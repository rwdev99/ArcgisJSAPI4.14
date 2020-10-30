

/**@see https://shouldjs.github.io/ */
import {mocks} from "mock-browser"
import * as  should from "should"

describe('proj4.js', ()=>{
    const {proj,
        proj97to84,
        proj84to97
    } = require('../dist/lib/proj4.js')
    it("測試座標轉換 WGS84 to TWD97", async ()=>{
        
        // "x" , "y" in Arcgis Geomerty obj is WGS84/Pseudo-Mercator
        const x = 13466611.693354817
        const y = 2850951.3870785907

        const lat = 24.79798034815115
        const lnt = 120.97263109443304
        const x97 = 247232.88270794685
        const y97 = 2743402.0819860026
        
        should.deepEqual(proj84to97([lnt,lat]),[x97,y97],"proj84to97 fail" )
        should.deepEqual(proj97to84([x97,y97]),[lnt,lat],"proj97to84 fail")

        // test WGS84/Pseudo-Mercator
        should.deepEqual(proj("EPSG:3857","EPSG:4326",[x,y]),proj("EPSG:900913","EPSG:4326",[x,y]),`"EPSG:3857" to "EPSG:4326" fail`)

    }) 
})

// describe('wicket.js [ for arcgis js api 4.14 ]',()=>{
//     const { wicket } = require('../dist/utils.js')
//     const WKT = `MULTIPOLYGON (((40 40, 20 45, 45 30, 40 40)), ((20 35, 10 30, 10 10, 30 5, 45 20, 20 35), (30 20, 20 15, 20 25, 30 20)))`
//     it("wkt2ArcgisObj", async ()=>{
//         // todo
//     })
    
// })