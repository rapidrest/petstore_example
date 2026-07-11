import React from "react";
import type Pet from "../../../src/models/Pet.js";

export default function Pets({ pets }: { pets: Pet[] }) {
    const petNodes: React.Node[] = pets.map((pet) => (
        <tr>
            <td>{pet.name}</td>
            <td>{pet.category?.name}</td>
            <td>{pet.tags?.join(', ')}</td>
            <td>{pet.status}</td>
        </tr>
    ));

    return (
        <table>
            <th>
                <td>Name</td>
                <td>Category</td>
                <td>Status</td>
                <td>Tags</td>
            </th>
            {petNodes}
        </table>
    );
}