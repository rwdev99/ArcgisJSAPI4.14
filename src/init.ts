import { loadModule,CONFIG } from './utils'

export class Init {

    map:__esri.Map|__esri.WebMap|__esri.WebScene
    view:__esri.MapView|__esri.SceneView
    
    defaultExtent:__esri.ExtentProperties
    backDefaultExtentWidget:__esri.Home
    useExtentConstraint: Boolean // 是否限制平移

    esriConfig:__esri.config


    /**@see https://developers.arcgis.com/javascript/latest/api-reference/esri-config.html */
    async setEsriConfig(config:__esri.config):Promise<void>{
        this.esriConfig = await loadModule<__esri.config>("esri/config")
    }

    async setEsriConfigRequestInterceptors(tables:Array<__init.interceptor>):Promise<void>{
        tables.forEach(({srcUrl,destUrl,proxyer})=>{
            const RequestInterceptor:__esri.RequestInterceptor = {
                before:({url})=>{
                    if(url !== srcUrl) return
                    url = destUrl ? destUrl : `${proxyer}?${url}`
                },
                error: ()=>console.error(`srcUrl ${srcUrl},destUrl ${destUrl},proxyer ${proxyer}`)
            }
            this.esriConfig.request.interceptors.push(RequestInterceptor)
        })
    }
    
    async create2D(
        mapConfig:__esri.MapProperties | __esri.WebMapProperties,
        viewConfig:__esri.MapViewProperties
    ):Promise<Init>{

        const MAP_URL = mapConfig && mapConfig.hasOwnProperty('portalItem') ? "WebMap" : "Map"
        
        const Map = (await loadModule<__esri.MapConstructor>(`esri/${MAP_URL}`))
        const View = (await loadModule<__esri.MapViewConstructor>(`esri/views/MapView`))

        this.defaultExtent = viewConfig.extent

        this.map = new Map(mapConfig)
        this.view = new View({...viewConfig,map:this.map})

        await this.setMapViewConstraintsLods(this.view as __esri.MapView)
        this.view.ui.components= []
        
        
        const Home = await loadModule<__esri.HomeConstructor>("esri/widgets/Home")
        this.backDefaultExtentWidget = new Home({
            view:this.view
        })
        
        return this
    }

    // todo
    async create3D(
        mapConfig: __esri.WebSceneProperties,
        viewConfig:__esri.SceneViewProperties
    ):Promise<Init>{

        const WEBSCENE_URL = mapConfig && ('portalItem' in mapConfig) ? "WebScene" : "Map"
        const Map = await loadModule< __esri.MapConstructor>(`esri/${WEBSCENE_URL}`)
        const View = await loadModule<__esri.SceneViewConstructor>(`esri/views/SceneView`)

        this.map = new Map(mapConfig)
        this.view = new View ({...viewConfig,map:this.map})

        this.view.ui.components= []
        
        return this
    }

    /**
     * 設置 ARCGIS 預設工具 到 ARCGIS UI 指定的位置
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-views-ui-DefaultUI.html
     */
    async setMapUI(components:string[],position?:'bottom-right'|'bottom-left'|'top-left'|'top-right'){
        try{
            if(/bottom-right|bottom-left|top-left|top-right'/ig.test(position)){
                this.view.ui.components = components
                await this.view.when()
                this.view.ui.move(['compass','zoom'],position)
            }else if(Array.isArray(components) && components.length===0){ //- assume to empty all
                this.view.ui.empty("bottom-right")
                this.view.ui.empty("bottom-left")
                this.view.ui.empty("top-left")
                this.view.ui.empty("top-right")
            }
        }catch(e){
            console.error(e)
        }
    }

    /**
     * 限制 mpaView 範圍 : scale
     * @returns {mapView}
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#constraints
     */
    setMapViewConstraintsScale(
        view:__esri.MapView,
        {maxScale,minScale}:{maxScale?:number,minScale?:number}
    ):__esri.MapView{
        if(maxScale) view.constraints.maxScale = maxScale 
        if(minScale) view.constraints.minScale = minScale 
        return view
    }

    /**
     * 限制 mpaView 範圍 : lods (必要，否則空白底圖會使scale顯示不正常)
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#constraints
     */
    async setMapViewConstraintsLods(view:__esri.MapView,lods?:Array<__init.lodProperties>):Promise<__esri.MapView>{
        lods = lods || CONFIG.LODS
        const Lod =  await loadModule<__esri.LODConstructor>(`esri/layers/support/LOD`)
        view.constraints.lods = lods.map(lod=>new Lod(lod))
        return view
    }

    /** 限制 mpaView 範圍 : extext (平移若超出預設 Extent 則自動回到預設) */
    setMapViewConstraintsExtent(){
        this.useExtentConstraint = true
        let outSide = false
        this.view.watch("extent", async (currentExtent:__esri.Extent) => {
            if(!this.useExtentConstraint) return
            let center = currentExtent.center
            if (outSide || !this.defaultExtent || !center) return
            if (center.x < this.defaultExtent.xmin ||
                center.x > this.defaultExtent.xmax ||
                center.y < this.defaultExtent.ymin ||
                center.y > this.defaultExtent.ymax
            ) {
                outSide = true
                await this.backDefaultExtentWidget.go()
                outSide = false
            }
        })
    }

    /** @see https://developer.mozilla.org/zh-TW/docs/Web/API/Geolocation/Using_geolocation */
    async getGeoLocation():Promise<[number,number]> {
        try {
            if (!navigator.geolocation) throw("不支援地理位置定位")
            const {coords:{latitude,longitude}} = await (new Promise((res, rej)=>{
                navigator.geolocation.getCurrentPosition(success=>res(success), error=>rej(error))
            })) as Position
            return [latitude,longitude]
        }catch(e){
            console.error("[ getGeoLocation fail ]",e)
            throw(e)
        }
    }


}
