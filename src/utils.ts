
import { loadModules } from 'esri-loader'
import {Wicket} from "./lib/wicket"

export * from "./lib/proj4"
export const loadModule = async <T>(url: string): Promise<T> => (await loadModules([url],{version: CONFIG.VERSION, css: true }))[0]

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
    ],
    GMAP:{
        KEY:"AIzaSyDVPt9t_LzShq5tdE_-8wpFmIVKNhGUWAE",
        ICON:"data:image/png;base64,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"
    }
}