import jsonp from "jsonp"
import { DrawPoint } from './drawPoint'
import { CONFIG } from './utils'

class DrawDirectPoint extends DrawPoint {

    constructor(view:__esri.MapView,map:__esri.Map){
        super(view,map)
        this.pointSymbol = {
            type: "picture-marker",
            url: CONFIG.GMAP.ICON,
            width: 30,
            height: 30,
        }
    }

    private _getCloneGraphic(): __esri.Graphic {
        if (!this.glyr.graphics.length) return
        return this.glyr.graphics.getItemAt(0).clone()
    }

    rotatePoint(viewRotation: number, angle: number) {
        let exsist = this._getCloneGraphic()
        if (!exsist) return

        exsist.symbol.set("angle", viewRotation + angle)
        this.clearGraphics()
        this.glyr.add(exsist)
    }

    async setPosition(loc: google.maps.LatLng | google.maps.LatLngLiteral) {
        let exsist = this._getCloneGraphic()
        if (!exsist) return

        exsist.geometry.set("latitude", loc.lat)
        exsist.geometry.set("longitude", loc.lng)

        this.clearGraphics()
        this.glyr.add(exsist)
    }
}


/**
 * @Singleton @see https://stackoverflow.com/questions/10485582/what-is-the-proper-way-to-destroy-a-map-instance 
 * @普通地圖API @see https://developers.google.com/maps/documentation/javascript/earthquakes
 * @街景API @see https://developers.google.com/maps/documentation/javascript/streetview#StreetViewMapUsage
 * @GooleMapJSAPI @see https://developers.google.com/maps/documentation/javascript/reference
 */
export class GoogleMaps {
    
    private constructor(view:__esri.MapView, map:__esri.Map , privateKey:string) {
        this._container = document.createElement("div")
        this._container.style.cssText = `height: 100%;`
    
        this._key = privateKey || CONFIG.GMAP.KEY
        this._view = view
        this._map = map
    }

    private static _GoogleMaps: GoogleMaps
    public static async getInstance(view:__esri.MapView, map:__esri.Map , privateKey:string) {
        if (GoogleMaps._GoogleMaps) {
            return GoogleMaps._GoogleMaps
        }
        GoogleMaps._GoogleMaps = new GoogleMaps(view,map,privateKey)
        return GoogleMaps._GoogleMaps
    }

    private _key: string
    private _container: HTMLElement
    private _view: __esri.MapView
    private _map: __esri.Map
    private _gmapStreetView: google.maps.StreetViewPanorama
    private _drawDirectPoint: DrawDirectPoint

    get gampAngle(): number {
        return this._gmapStreetView.getPov().heading
    }

    get gmapPos(): google.maps.LatLng | google.maps.LatLngLiteral {
        return this._gmapStreetView.getPosition().toJSON()
    }

    get drawedLoc():{lat:number,lng:number} {
        if(!this._drawDirectPoint.glyr.graphics.length) return
        const {latitude,longitude} = this._drawDirectPoint.glyr.graphics.getItemAt(0).geometry as any
        return {lat:latitude,lng:longitude}
    }
    
    private async _create() {
        try {

            // cros : will be loaded in window 
            await (new Promise((reslove, reject) => {
                jsonp(
                    `http://maps.googleapis.com/maps/api/js?key=${this._key}`,
                    {},
                    (err, data) => err ? reject(err) : reslove(data)
                )
            }))
            
            this._drawDirectPoint = await new DrawDirectPoint(this._view,this._map).load()
            
            const {StreetViewPanorama} = window.google.maps
            this._gmapStreetView = new StreetViewPanorama(
                this._container, {
                zoom: 12,
                pov: {
                    heading: 34,
                    pitch: 10
                }
            })

        } catch (e) {
            console.error(e)
            throw (e)
        }
    }
    

    sleep(): void {
        this._unbindEvents()
        this._drawDirectPoint.destroy()
    }

    async wakeUp(): Promise<HTMLElement> {
        if(!this._gmapStreetView||!this._drawDirectPoint){
            await this._create()
        }
        await this._bindEvents()
        await this._handleClick()
        return this._container
    }

    private _rotationHandler: __esri.WatchHandle
    private _clickHandler: IHandle
    private _povChangeHandler: google.maps.MapsEventListener
    
    private async _bindEvents() {
        const view = this._view as __esri.MapView
        this._rotationHandler = view.watch("rotation",this._handleRotation.bind(this))
        this._clickHandler = view.on("immediate-click",this._handleClick.bind(this))
    }
    private _unbindEvents() {
        this._rotationHandler.remove()
        this._clickHandler.remove()
        this._povChangeHandler.remove()
    }

    private _handleRotation(rotation){
        this._drawDirectPoint.rotatePoint(rotation,this.gampAngle)
    }

    private async _handleClick(){
        await this._drawDirectPoint.draw()

        this._drawDirectPoint.eventHub.on('complete',async ()=>{

            await this._gmapStreetView.setPosition(this.drawedLoc)

            /**
             * the dom of googlemap was return by "this.wakeUp()" first ( will trigger the "pov_changed" event )
             * it will cause error to bind event before draw complete ( this.gmapPos haven't caculated )
             */
            if(!this._povChangeHandler){
                this._povChangeHandler = this._gmapStreetView.addListener("pov_changed", async()=>{
                    await this._drawDirectPoint.setPosition(this.gmapPos)
                    this._drawDirectPoint.rotatePoint(this._view.rotation, this.gampAngle)
                })
            }
        })

    }

}