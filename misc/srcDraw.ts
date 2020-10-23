import {LayerFactory} from './layer';

import { DefaultDraw } from './base';
import { Init } from './init';

import { DrawPoint } from './drawPoint'
import { DrawPolyline } from './drawPolyline'
import { DrawPolygon } from './drawPolygon';

import { CoordTransaction,checkAgentIsMobile } from  './utils';

class DrawFactory {

  Init: Init

  constructor(Init: Init) {
    this.Init = Init
  }

  DrawPolygon: DrawPolygon
  DrawPoint: DrawPoint
  DrawPolyline: DrawPolyline

  //- 將上一個繪製完成的繪圖圖層放到佇列達成循環
  private _glyrQueue: Array<__esri.GraphicsLayer> = [] 

  /**
   * 每一圖形的處理必須一整個繪圖圖層
   */
  async createGlyr(
    options={
        ID: "drawing_queue_loop_"+Date.now(),
        Datatype:"graphicslayer",
        LayerName:"佇列循環幾何繪製"
    }
  ):Promise<__esri.GraphicsLayer>{
    return await new LayerFactory(this.Init.map).addRawLayer("graphiclayer",options)
  }

  async createPolygon(glyr:__esri.GraphicsLayer){
    if(!this.DrawPolygon) this.DrawPolygon = new DrawPolygon(this.Init, glyr)
    this.DrawPolygon.Glyr = glyr
  }
  async createPoint(glyr:__esri.GraphicsLayer){
    if(!this.DrawPoint) this.DrawPoint = new DrawPoint(this.Init, glyr)
    this.DrawPoint.Glyr = glyr
  }
  async createPolyline(glyr:__esri.GraphicsLayer){
    if(!this.DrawPolyline) this.DrawPolyline = new DrawPolyline(this.Init, glyr)
    this.DrawPolyline.Glyr = glyr
  }

  /**
   * Search methods
   */
  //- POLYGON
  async preparePolygonSearch(){
    this._init() // Promise 完成後 重複循環、清除上一個實例
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)
    await this.createPolygon(glyr)
    await this.DrawPolygon.create()
    return this.DrawPolygon
  }
  async doDrawPolygonSearch(drawOption: __draw.option): Promise<string> {
    if(checkAgentIsMobile()){
        await this.DrawPolygon.performSketch()
    }else{
        await this.DrawPolygon.perform()
    }
    if(!this.DrawPolygon)  throw("Promise 已銷毀 DrawPolygon 物件不存在")
    return await this.DrawPolygon.getWKTfromGlyr()
  }
  bufferDrawPolygon(buffer){
    if(this.DrawPolygon) this.DrawPolygon.buffer = buffer
  }
  //- POINT
  async preparePointSearch(){
    this._init()
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)
    await this.createPoint(glyr)
    await this.DrawPoint.create()
    return this.DrawPoint
  }
  async doDrawPointSearch(drawOption: __draw.option): Promise<string> {
    if(checkAgentIsMobile()){
        await this.DrawPoint.performSketch()
    }else{
        await this.DrawPoint.perform()
    }
    if(!this.DrawPoint)  throw("Promise 已銷毀 DrawPoint 物件不存在")
    return await this.DrawPoint.getWKTfromGlyr()
  }
  bufferDrawPoint(buffer){
    if(this.DrawPoint) this.DrawPoint.buffer = buffer
  }
  //- POLYLINE
  async preparePolylineSearch(){
    this._init()
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)
    await this.createPolyline(glyr)
    await this.DrawPolyline.create()
    return this.DrawPolyline
  }
  async doDrawPolylineSearch(drawOption: __draw.option): Promise<string> {
    if(checkAgentIsMobile()){
        await this.DrawPolyline.performSketch()
    }else{
        await this.DrawPolyline.perform()
    }
    if(!this.DrawPolyline)  throw("Promise 已銷毀 DrawPolyline 物件不存在")
    return await this.DrawPolyline.getWKTfromGlyr()
  }
  bufferDrawPolyline(buffer){
    if(this.DrawPolyline) this.DrawPolyline.buffer = buffer
  }
  /**
   * Measure methods
   * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngineAsync.html#planarArea
   */
  async preparePolygonMeasure(){
    this._init()
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)
    await this.createPolygon(glyr)
    await this.DrawPolygon.create()
    return this.DrawPolygon
  }
  async doDrawPolygonMeasure(): Promise<__draw.measurePloygonResult> {
    if(checkAgentIsMobile()){
        await this.DrawPolygon.performSketch()
    }else{
        await this.DrawPolygon.perform()
    }
    if(!this.DrawPolygon)  throw("Promise 已銷毀 DrawPolygon 物件不存在")
    let geometry = this.DrawPolygon.Glyr.graphics.getItemAt(0).geometry
    return {
      area_hectare:await this.DrawPolygon.Engine.geodesicArea(geometry as __esri.Polygon,"hectares"),
      area_metric:await this.DrawPolygon.Engine.geodesicArea(geometry as __esri.Polygon,"square-meters"),
      length_metric:await this.DrawPolygon.Engine.geodesicLength(geometry,"meters"),
      length_kmetric:await this.DrawPolygon.Engine.geodesicLength(geometry,"kilometers"),
    }
  }
  async preparePointMeasure(){
    this._init()
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)

    await this.createPoint(glyr)
    await this.DrawPoint.create()
    return this.DrawPoint
  }
  async doDrawPointMeasure(): Promise<__draw.measurePointResult> {
    if(checkAgentIsMobile()){
        await this.DrawPoint.performSketch()
    }else{
        await this.DrawPoint.perform()
    }
    if(!this.DrawPoint)  throw("Promise 已銷毀 DrawPoint 物件不存在")
    let geometry = this.DrawPoint.Glyr.graphics.getItemAt(0).geometry as __esri.Point

    return {
      latitude:geometry.latitude,
      longitude:geometry.longitude,
      X97:(await CoordTransaction.convertCoord(geometry.x,geometry.y))[97][0],
      Y97:(await CoordTransaction.convertCoord(geometry.x,geometry.y))[97][1],
    }
  }
  async preparePolylineMeasure(){
    this._init()
    let glyr = await this.createGlyr()
    this._glyrQueue.push(glyr)
    
    await this.createPolyline(glyr)
    await this.DrawPolyline.create()
    return this.DrawPolyline
  }
  async doDrawPolylineMeasure(): Promise<__draw.measurePolylineResult> {
    if(checkAgentIsMobile()){
        await this.DrawPolyline.performSketch()
    }else{
        await this.DrawPolyline.perform()
    }
    if(!this.DrawPolyline) throw("Promise 已銷毀 DrawPolyline 物件不存在")
    let geometry = this.DrawPolyline.Glyr.graphics.getItemAt(0).geometry

    return {
      metric:await this.DrawPolyline.Engine.geodesicLength(geometry,"meters"),
      kmetric:await this.DrawPolyline.Engine.geodesicLength(geometry,"kilometers")
    }
  }

  /**
   * 每次循環結束觸發重置
   */
  //-
  private _init() {
    this.DrawPolygon && this.DrawPolygon.destroy()
    this.DrawPoint && this.DrawPoint.destroy()
    this.DrawPolyline && this.DrawPolyline.destroy()
    if (this._glyrQueue.length > 1) {
      this.Init.map.remove(this._glyrQueue.shift()) //- 從地圖實例移除佇列之 First out
    }
  }

  destroy(){
    this._init() // 循環還沒完成前被終止會無法觸發重置
    this.Init.map.removeMany(this._glyrQueue) // 從地圖實例移除所有繪圖圖層
    this._glyrQueue.splice(0,this._glyrQueue.length-1) // 清除佇列
    // 成員釋放引用
    this.DrawPolygon = null
    this.DrawPoint = null
    this.DrawPolyline = null
  }

}

export { DrawFactory, DefaultDraw }