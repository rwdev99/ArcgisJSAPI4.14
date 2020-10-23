declare namespace __init {

    interface lodProperties{
        level:number
        scale:number
        resolution:number
    }
    
    interface interceptor{
        srcUrl:string,
        destUrl?:string,
        proxyer?:string
    }

    type mapConfig = __esri.MapProperties | __esri.WebMapProperties | __esri.WebSceneProperties
    
    type viewConfig = __esri.SceneViewProperties | __esri.MapViewProperties

}