export async function askAI(question){

try{

    const response = await fetch("https://api.openai.com/v1/chat/completions",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${import.meta.env.VITE_OPENAI_KEY}`
        },
        body:JSON.stringify({
            model:"gpt-4o-mini",
            messages:[
                {
                    role:"system",
                    content:"You are a helpful travel guide explaining places to tourists."
                },
                {
                    role:"user",
                    content:question
                }
            ]
        })
    });

    const data = await response.json();

    return data.choices[0].message.content;

}catch(err){

    console.error(err);
    return "AI error occurred";

}

}
