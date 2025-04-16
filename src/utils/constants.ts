import { constants } from "http2";

export const serverResponseCodes = {
  Error: 500,
  Invalid_Parameters: 400,
  Unauthorized: 401,
  Permissions_Denied: 403,
  NoData: 404,
  AlreadyExist: 404,
  Success: 200,
  AcessToken: 440,
  limitExceeded: 409
}
interface StatusMapping {
  [key: number]: string;
}
export const whoCanUse = { 0: "All", 1: "Self", 2: "Dependent" }
export const approvalStatus: StatusMapping = { 0: "PendingFinanceApproval", 1: "Approved", 2: "Active", 3: "InActive", 4: "Rejected" }
export const usageLimit = { "-1": "UnLimited", 0: "Paid" }
export const relations = ["Father", "Mother", "Brother", "Sister", "Mother-in-law", 'Father-in-law', 'Son', 'Daughter', 'Spouse']
export const corporatePoc = ["HR", "Finance", "Operation", "OperationHead"]
export const planExpiryRule = { 0: "As Per MOU", 1: "1 Year  From Registered Date" }
export const whoPayingType = { 0: "Company", 1: "User" }

export const customerImagesPath = "customer";
export const comapnyImagesPath = "company";
export const anvayaaUsers = "anvayaUsers";


export const emergencyFor = { 0: 'Self', 1: 'Dependent', 2: 'Both' }

//export const googleApiKey='AIzaSyDXPAPzNI60GsR8IKB5lwPj-6FR43IPkMc'
//   export const googleApiKey='AIzaSyBMqjNJyVE1Vy8TuNg2XgM98gvSY7DCRQw'

export const googleApiKey = 'AIzaSyCCd8GvC_IoSqz_MoiW8CNAdl4D28vuSWA';

export const statuses = {
  active: "active",
  inactive: "inactive",
}

export const ambulanceStatus = {
  available: "available",
  notavailable: "notavailable",
  busy:"busy"
 
}

export const ambulanceStatusmap: { [key: number]: string } = {
  2: "available",
  3: "notavailable",
  4:"busy" 
}



export const statusmap: { [key: number]: string } = {
  2: "active",
  3: "inactive",
  4:"testassigned"
}

export function getStatus(status: number | string): string | number {
  const statusTypes = statusmap
  if (typeof status === 'string') {
    const value = Object.keys(statusTypes).find((obj: any) => statusTypes[obj] === status);
    if (value) {
      return parseInt(value)
    } else {
      return 'Unknown'
    }
  } else {
    return statusTypes[status] || 'Unknown';
  }
}

export function getambulanceStatus(status: number | string): string | number {
  const statusTypes = ambulanceStatusmap
  if (typeof status === 'string') {
    const value = Object.keys(statusTypes).find((obj: any) => statusTypes[obj] === status);
    if (value) {
      return parseInt(value)
    } else {
      return 'Unknown'
    }
  } else {
    return statusTypes[status] || 'Unknown';
  }
}

