
import { loadModules } from 'esri-loader'
import {Wicket} from "./lib/wicket"

export * from "./lib/proj4"
export const loadModule = async <T>(url: string): Promise<T> => (await loadModules([url],{version: CONFIG.VERSION, css: true }))[0]

export const CONFIG = {
    GSVR_URL:"https://urbangis.hccg.gov.tw/arcgis/rest/services/Utilities/Geometry/GeometryServer",
    VERSION: "4.14",
    LODS:[
        {
            "level": 1,
            "scale": 295828763.795777,
            "resolution": 78271.5169639999
        },
        {
            "level": 2,
            "scale": 147914381.897889,
            "resolution": 39135.7584820001
        },
        {
            "level": 3,
            "scale": 73957190.948944,
            "resolution": 19567.8792409999
        },
        {
            "level": 4,
            "scale": 36978595.474472,
            "resolution": 9783.93962049996
        },
        {
            "level": 5,
            "scale": 18489297.737236,
            "resolution": 4891.96981024998
        },
        {
            "level": 6,
            "scale": 9244648.868618,
            "resolution": 2445.98490512499
        },
        {
            "level": 7,
            "scale": 4622324.434309,
            "resolution": 1222.99245256249
        },
        {
            "level": 8,
            "scale": 2311162.217155,
            "resolution": 611.49622628138
        },
        {
            "level": 9,
            "scale": 1155581.108577,
            "resolution": 305.748113140558
        },
        {
            "level": 10,
            "scale": 577790.554289,
            "resolution": 152.874056570411
        },
        {
            "level": 11,
            "scale": 288895.277144,
            "resolution": 76.4370282850732
        },
        {
            "level": 12,
            "scale": 144447.638572,
            "resolution": 38.2185141425366
        },
        {
            "level": 13,
            "scale": 72223.819286,
            "resolution": 19.1092570712683
        },
        {
            "level": 14,
            "scale": 36111.909643,
            "resolution": 9.55462853563415
        },
        {
            "level": 15,
            "scale": 18055.954822,
            "resolution": 4.77731426794937
        },
        {
            "level": 16,
            "scale": 9027.977411,
            "resolution": 2.38865713397468
        },
        {
            "level": 17,
            "scale": 4513.988705,
            "resolution": 1.19432856685505
        },
        {
            "level": 18,
            "scale": 2256.994353,
            "resolution": 0.597164283559817
        },
        {
            "level": 19,
            "scale": 1128.4994333441377,
            "resolution": 0.298582141647617
        },
        {
            "level": 20,
            "scale": 564.2497166720685,
            "resolution": 0.1492910708238085
        },
        {
            "level": 21,
            "scale": 282.124294,
            "resolution": 0.07464553541190416
        },
        {
            "level": 22,
            "scale": 141.062147,
            "resolution": 0.03732276770595208
        },
        {   "level": 23, 
            "scale": 70.5310735, 
            "resolution": 0.01866138385297604 
        }
    ]
}

export class TipText {

    dom: HTMLElement
    view: __esri.MapView | __esri.SceneView

    constructor(view: __esri.MapView | __esri.SceneView, style?: string) {

        this.view = view
        this.dom = document.createElement("small")

        this.view.container.appendChild(this.dom)

        const defaultStyle = `
            visibility:hidden;
            position:fixed;
            top:0px;
            left:0px;
            margin:1rem 0 0 1rem;
            padding:0.5rem;
            pointer-events:none;
            background:rgba(0,0,0,0.5);
            color:#fff;
            border-radius:5px;
        `
        this.dom.style.cssText = defaultStyle + style
    }

    setPosition(x: number, y: number) {
        this.dom.style.transform = `translate(${x}px,${y}px)`
        this.dom.style.visibility = "visible"
    }

    setText(text: string, type?: "warning") {
        this.dom.style.visibility = text === '' ? 'hidden': 'visible'
        
        this.dom.innerText = text
        this.dom.style.background = "rgba(0,0,0,0.5)"
        this.dom.style.color = "#fff"
        if (type === "warning") {
            this.dom.style.color = "red"
            this.dom.style.background = "rgba(256,256,256,0.8)"
        }
    }

    destroy() {
        if (this.view.container.contains(this.dom)) {
            this.view.container.removeChild(this.dom)
        }
    }

}

export class GeometryTransaction {

    Geometry: __esri.GeometryConstructor
    Point: __esri.PointConstructor
    SpatialReference: __esri.SpatialReferenceConstructor
    ProjectParameters: __esri.ProjectParametersConstructor

    wicket: Wicket
    clientProjection: __esri.projection
    gsrv: __esri.GeometryService

    async load() {

        this.Geometry = await loadModule<__esri.GeometryConstructor>("esri/geometry/Geometry")
        this.Point = await loadModule<__esri.PointConstructor>("esri/geometry/Point")
        this.SpatialReference = await loadModule<__esri.SpatialReferenceConstructor>("esri/geometry/SpatialReference")

        const Gsrv = await loadModule<__esri.GeometryServiceConstructor>("esri/geometry/SpatialReference")
        this.gsrv = new Gsrv({ url:CONFIG.GSVR_URL })

        this.clientProjection = await loadModule<__esri.projection>("esri/geometry/projection")
        await this.clientProjection.load()

        this.ProjectParameters = await loadModule<__esri.ProjectParametersConstructor>("esri/tasks/support/ProjectParameters")
        
        this.wicket = await new Wicket().load()
        
        return this
    }

    async toWkt(
        geometries: __esri.Geometry[],
        destWKID: __esri.SpatialReferenceProperties = { wkid: 3826 }
    ): Promise<string> {

        const destSpatialReference = new this.SpatialReference(destWKID)

        // ? : check the intent
        // geometries = geometries.map(geometry => {
        //     if (geometry.type === "point") {

        //         return new this.Point({ ...geometry, spatialReference: destSpatialReference })
        //     } else {
        //         console.error("[convertToWkt input error]", geometry)
        //     }
        //     return geometry
        // })

        // project by client
        const projed = this.clientProjection.project(geometries, destSpatialReference)[0]
        
        this.wicket.fromObject(projed)
        const wktStr = this.wicket.write()

        console.log("[convertToWkt result]", wktStr)

        return wktStr
    }

    async toArcgis(
        wkt: string,
        srcWKID: __esri.SpatialReferenceProperties,
        destWKID: __esri.SpatialReferenceProperties = { wkid: 102443 }
    ): Promise<__esri.Geometry> {

        this.wicket.read(wkt)
        const geometries = this.wicket.toObject({ spatialReference: srcWKID })

        // todo web assembly : client proj

        // by gemetry srvs
        const projectParameters = new this.ProjectParameters({
            geometries,
            outSpatialReference: new this.SpatialReference(destWKID),
        })
        const res = (await this.gsrv.project(projectParameters))[0]

        console.log("[ convertArcgis ]", res)
        return res
    }
}

export const checkAgentIsMobile = ():boolean => {
    let agent = navigator.userAgent || navigator.vendor 
    return /(android|bb\d+|meego|ipad).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android/i.test(agent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(agent)
}

export class EventHub {
    private callstack: {[key: string]: Array<(data: any) => void>} = {}
    on(eventname: string, fn: (data: any) => void) {
        this.callstack[eventname] = this.callstack[eventname] || []
        this.callstack[eventname].push(fn)
    }
    emit(eventname: string, data?: any) {
        if(this.callstack[eventname] === undefined) return
        this.callstack[eventname].forEach(fn => fn(data))
    }
    off(eventname: string, fn: (data: any) => void) {
        if(this.callstack[eventname] === undefined || this.callstack[eventname].length === 0) return
        const i = this.callstack[eventname].indexOf(fn)
        if(i === -1) return
        this.callstack[eventname].splice(i, 1)
    }
}