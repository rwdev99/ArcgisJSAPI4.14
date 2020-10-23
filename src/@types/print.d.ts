
interface getPrintPDFURLParams {
    printContent:string
    pageSize:string
    pageDirection:string
}
interface getPrintPDFURLResponse{
    fileName:string
    fileUrl:string
}
interface Ihistory extends getPrintPDFURLResponse{
    date: Date
}