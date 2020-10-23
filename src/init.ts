import { loadModule } from './utils'

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

        const MAP_URL = mapConfig.hasOwnProperty('portalItem') ? "WebMap" : "Map"
        
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
    // async create3D(
    //     mapConfig: __esri.WebSceneProperties,
    //     viewConfig:__esri.SceneViewProperties
    // ):Promise<Init>{

    //     const WEBSCENE_URL = mapConfig && ('portalItem' in mapConfig) ? "WebScene" : "Map"
    //     const Map = await loadModule< __esri.MapConstructor>(`esri/${WEBSCENE_URL}`)
    //     const View = await loadModule<__esri.SceneViewConstructor>(`esri/views/SceneView`)

    //     this.map = new Map(mapConfig)
    //     this.view = new View ({...viewConfig,map:this.map})

    //     this.view.ui.components= []
        
    //     return this
    // }

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
            }else{
                throw new TypeError("Illegal components:"+components.join('、')+"or Illegal position:"+position)
            }
            await this.view.when()
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
        scale:{
            maxScale?:number,
            minScale?:number
        }
    ):__esri.MapView{
        if(scale&&scale.maxScale) view.constraints.maxScale = scale.maxScale 
        if(scale&&scale.minScale) view.constraints.minScale = scale.minScale 
        return view
    }

    /**
     * 限制 mpaView 範圍 : lods (必要，否則空白底圖會使scale顯示不正常)
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#constraints
     */
    async setMapViewConstraintsLods(view:__esri.MapView,lods?:Array<__init.lodProperties>):Promise<__esri.MapView>{
        lods = lods || [
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
            try{
                const pos = await (new Promise((res, rej)=>{
                    navigator.geolocation.getCurrentPosition(success=>res(success), error=>rej(error))
                })) as any
                const latitude  = pos.coords.latitude;
                const longitude = pos.coords.longitude;
                return [latitude,longitude]
            }catch(e){
                throw (e)
            }
        }catch(e){
            console.error("geo location errro",e)
            throw(e)
        }
    }

}
