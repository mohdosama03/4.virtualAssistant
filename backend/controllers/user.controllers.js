 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"
 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}

export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}

const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}


export const askToAssistant=async (req,res)=>{
   try {
      const command = typeof req.body?.command === "string" ? req.body.command.trim() : ""
      if (!command) {
         return res.status(400).json({ response: "Please say or type a question first." })
      }

      const user=await User.findById(req.userId);
      if (!user) {
         return res.status(404).json({ response: "Your account could not be found. Please sign in again." })
      }
      user.history.push(command)
      await user.save()
      const userName=user.name
      const assistantName=user.assistantName
      const result=await geminiResponse(command,assistantName,userName)

      const jsonMatch=typeof result === "string" ? result.match(/{[\s\S]*}/) : null
      if(!jsonMatch){
         return res.status(502).json({response:"I couldn't understand the AI service response. Please try again."})
      }
      let gemResult
      try {
         gemResult=JSON.parse(jsonMatch[0])
      } catch {
         return res.status(502).json({response:"I couldn't understand the AI service response. Please try again."})
      }

      const type=gemResult.type
      const userInput=typeof gemResult.userInput === "string" ? gemResult.userInput : command
      const response=typeof gemResult.response === "string" ? gemResult.response : "I'm sorry, I couldn't create a response. Please try again."

      switch(type){
         case 'get-date' :
            return res.json({
               type,
               userInput,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
            case 'get-time':
                return res.json({
               type,
               userInput,
               response:`current time is ${moment().format("hh:mm A")}`
            });
             case 'get-day':
                return res.json({
               type,
               userInput,
               response:`today is ${moment().format("dddd")}`
            });
            case 'get-month':
                return res.json({
               type,
               userInput,
               response:`today is ${moment().format("MMMM")}`
            });
      case 'google-search':
      case 'youtube-search':
      case 'youtube-play':
      case 'general':
      case  "calculator-open":
      case "instagram-open": 
       case "facebook-open": 
       case "weather-show" :
         return res.json({
            type,
            userInput,
            response,
         });

         default:
            return res.status(400).json({ response: "I didn't understand that command." })
      }
     

   } catch (error) {
  console.error("Assistant request failed:", error.response?.data || error.message)
  const upstreamStatus = error.response?.status
  let response = "I couldn't get a response right now. Please check the backend and try again."

  if (error.isConfigError) {
     response = error.message
  } else if ([400, 401, 403].includes(upstreamStatus)) {
     response = "Gemini rejected the request. Check that GEMINI_API_KEY is valid and GEMINI_MODEL is supported."
  } else if (upstreamStatus === 404) {
     response = "Gemini could not find or access the configured model. Set GEMINI_MODEL to a model enabled for your API key, then restart the backend."
  } else if (upstreamStatus === 429) {
     response = "Gemini request quota is exhausted. Please try again later."
  } else if (upstreamStatus >= 500) {
     response = "Gemini is temporarily experiencing high traffic. Please try again in a moment."
  }

  const statusCode = error.isConfigError ? 503 : (upstreamStatus ? 502 : 500)
  return res.status(statusCode).json({ response })
   }
}
