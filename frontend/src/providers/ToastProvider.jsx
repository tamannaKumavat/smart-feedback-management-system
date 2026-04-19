import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function ToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      className="md:mx-[32px] 2xl:mx-[48px]"
      toastClassName="!border !border-[#D1D5DB] !rounded-[10px] !max-w-[300px] md:!max-w-full"
      autoClose={3000}
      closeButton
    />
  )
}
