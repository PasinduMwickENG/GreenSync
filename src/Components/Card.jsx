import React from 'react'
import './Values.css'


function Card({card}) {
  
  return (

 <div className="px-0">   

  <a href="#" class="block w-50 h-30 p-4  rounded-lg shadow-sm  dark:bg-green-500 ">

  <h5 className="readings text-black justify-center text-5xl font-bold mb-5 ">{card.reading}</h5>
  <p className="text-3xl flex mb-5 font-bold text-white justify-center">{card.value}</p>
  </a>

    </div>
  )
}

export default Card